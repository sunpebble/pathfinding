/**
 * 批量 AI 游记处理脚本
 *
 * 使用自定义 AI API 处理未处理的游记。
 *
 * D8: 筛选条件为字段级（enrichedData.aiDays 缺失才处理，DB 级 JSON_EXTRACT 过滤），
 *     写回为读-合并-写（保留既有 key，AI 产物 key 以最新值替换）。
 * D14: prompt 不再要求 LLM 输出经纬度；AI 提取 POI 名称后由 geocoding 服务
 *     （高德，GCJ-02→WGS-84）解析坐标并校验范围/城市一致性。
 *
 * 使用方法:
 *   npx tsx scripts/batch-ai-process.ts --limit 10
 *   npx tsx scripts/batch-ai-process.ts --all
 *
 * 环境变量:
 *   DATABASE_URL - TiDB 连接字符串
 *   AI_BASE_URL - AI API 基础 URL (默认: https://o.kunish.org)
 *   AI_API_KEY - AI API 密钥
 *   AI_MODEL - 使用的模型 (默认: gemini-3-pro-high)
 *   AMAP_API_KEY - 高德地理编码 key（未配置时坐标标记为 pending，绝不写 0,0）
 */

import type { GeocodingProvider } from '../packages/api/src/services/geocoding.service.js';
import { asc, eq, sql } from 'drizzle-orm';
import {
  buildGeocodingMetrics,
  createGeocodingProvider,
  geocodeAiDays,
} from '../packages/api/src/services/geocoding.service.js';
import { createDb, travelGuideAiData, travelGuides } from '../packages/database/src/index';

// ============================================
// 配置
// ============================================

const config = {
  aiBaseUrl: process.env.AI_BASE_URL || 'https://o.kunish.org',
  aiApiKey: process.env.AI_API_KEY || '',
  aiModel: process.env.AI_MODEL || 'gemini-3-pro-high',
  batchSize: 10,
  delayBetweenRequests: 2000, // 2 秒
};

// ============================================
// 类型定义
// ============================================

interface Guide {
  id: number;
  title: string;
  content: string | null;
  destinations: unknown;
  platform: string;
  enrichedData: Record<string, unknown> | null;
}

interface POI {
  name: string;
  type: string;
  description?: string;
  /** D14: 由 geocoding 服务写入（WGS-84），LLM 不再输出。 */
  latitude?: number;
  longitude?: number;
  address?: string;
  duration?: string;
  priceInfo?: string;
  openingHours?: string;
  tips?: string;
  rating?: number;
  highlights?: string[];
  transportToNext?: {
    mode?: string;
    duration?: string;
    distance?: string;
    notes?: string;
  };
  geocodeConfidence?: number;
  geocodeSource?: string;
  geocodeError?: string;
}

interface DayPlan {
  dayNumber: number;
  theme?: string;
  pois: POI[];
}

interface AIResponse {
  aiSummary?: string;
  aiTips?: string[];
  aiBestTime?: string;
  aiDuration?: string;
  aiBudget?: string;
  aiDays?: DayPlan[];
  contentMarkdown?: string;
}

// ============================================
// 工具函数
// ============================================

function log(message: string, data?: unknown) {
  const timestamp = new Date().toISOString();
  if (data) {
    console.warn(`[${timestamp}] ${message}`, JSON.stringify(data, null, 2));
  }
  else {
    console.warn(`[${timestamp}] ${message}`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 递归清理对象中的 null 值，将其转换为 undefined
 */
function cleanNullValues<T>(obj: T): T {
  if (obj === null) {
    return undefined as T;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanNullValues(item)) as T;
  }
  if (typeof obj === 'object' && obj !== null) {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const cleanedValue = cleanNullValues(value);
      if (cleanedValue !== undefined) {
        cleaned[key] = cleanedValue;
      }
    }
    return cleaned as T;
  }
  return obj;
}

// ============================================
// AI API 调用
// ============================================

const SYSTEM_PROMPT = `你是一个旅游行程分析专家。根据用户提供的游记内容，提取并生成结构化的旅行信息。

请用 JSON 格式返回以下信息：
{
  "contentMarkdown": "将原文内容重新格式化为 Markdown 格式的完整文章",
  "aiSummary": "简洁的游记摘要（100-200字）",
  "aiTips": ["实用旅行建议1", "实用旅行建议2", ...],
  "aiBestTime": "最佳旅行时间（如：3-5月、9-11月）",
  "aiDuration": "建议行程时长（如：5天4晚）",
  "aiBudget": "预算建议（如：人均3000-5000元）",
  "aiDays": [
    {
      "dayNumber": 1,
      "theme": "当日主题（如：古城探索）",
      "pois": [
        {
          "name": "景点名称",
          "type": "景点类型（attraction/restaurant/hotel/shopping/entertainment/transport）",
          "description": "简短描述",
          "address": "地址",
          "duration": "建议游玩时长",
          "priceInfo": "价格信息",
          "tips": "实用小贴士"
        }
      ]
    }
  ]
}

关于 contentMarkdown 字段的要求：
1. 保留原文的所有内容，不要删减或编造
2. 根据内容语义添加合适的段落分隔（空行）
3. 识别并标记标题（用 ## 或 ###）
4. 识别列表内容（用 - 或 1. 2. 3.）
5. 重要信息或关键词可以用 **加粗** 标记
6. 如果原文有明显的章节结构，用标题层级体现
7. 保持原文语气和风格，只做格式化，不改写内容

注意：
1. 不要输出任何经纬度坐标，坐标由专门的地理编码服务解析
2. 所有字段都是可选的，如果游记中没有相关信息，可以省略
3. 尽量从游记中提取真实信息，不要编造
4. 返回纯 JSON，不要包含其他文本`;

async function callAI(
  content: string,
  title?: string,
): Promise<AIResponse | null> {
  const userPrompt = `请分析以下游记并提取结构化信息：

标题：${title || '无标题'}

内容：
${content.slice(0, 15000)}
`;

  try {
    const response = await fetch(`${config.aiBaseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.aiApiKey}`,
      },
      body: JSON.stringify({
        model: config.aiModel,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message?.content;

    if (!assistantMessage) {
      throw new Error('Empty AI response');
    }

    // 尝试解析 JSON
    let jsonStr = assistantMessage.trim();

    // 提取 JSON 块（如果被包裹在 markdown 代码块中）
    // 使用多种模式匹配
    const jsonMatch = jsonStr.match(/```(?:json)?\n?([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }
    else {
      // 尝试直接找第一个 { 到最后一个 } 之间的内容
      const firstBrace = jsonStr.indexOf('{');
      const lastBrace = jsonStr.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
      }
    }

    // 修复常见 JSON 错误
    jsonStr = jsonStr
      // 移除尾部逗号 (在 ] 或 } 之前)
      .replace(/,\s*([}\]])/g, '$1')
      // 修复缺失的逗号 (在 } 和 { 之间, 或 " 和 " 之间的换行处)
      .replace(
        /\}[\t\v\f\r \xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]*\n\s*\{/g,
        '},\n{',
      )
      .replace(
        /"[\t\v\f\r \xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]*\n\s*"/g,
        '",\n"',
      );

    let parsed: AIResponse;
    try {
      parsed = JSON.parse(jsonStr.trim()) as AIResponse;
    }
    catch {
      // 最后尝试: 截断到最后一个有效的 } 或 ]
      let depth = 0;
      let lastValid = -1;
      for (let i = 0; i < jsonStr.length; i++) {
        const ch = jsonStr[i];
        if (ch === '{' || ch === '[')
          depth++;
        if (ch === '}' || ch === ']') {
          depth--;
          if (depth === 0) {
            lastValid = i;
            break;
          }
        }
      }
      if (lastValid > 0) {
        parsed = JSON.parse(jsonStr.slice(0, lastValid + 1)) as AIResponse;
      }
      else {
        throw new Error('Cannot repair JSON');
      }
    }

    // 清理 null 值
    return cleanNullValues(parsed);
  }
  catch (error) {
    log('AI call failed', {
      error: error instanceof Error ? error.message : error,
    });
    return null;
  }
}

// ============================================
// 主流程
// ============================================

/** 取游记第一个目的地名，作为地理编码的城市上下文。 */
function firstDestinationName(destinations: unknown): string | undefined {
  if (!Array.isArray(destinations)) {
    return undefined;
  }
  for (const item of destinations) {
    if (typeof item === 'string' && item.trim()) {
      return item.trim();
    }
    if (item && typeof item === 'object' && typeof (item as { name?: unknown }).name === 'string') {
      const name = (item as { name: string }).name.trim();
      if (name) {
        return name;
      }
    }
  }
  return undefined;
}

/** 仅保留有值的 key，避免 undefined 覆盖既有 enrichedData。 */
function pickDefined(record: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined),
  );
}

/**
 * aiDays（dayNumber/latitude/longitude）→ schema 约定的 dayItineraries
 * （day/lat/lng）。只收录坐标已解析的 POI——绝不写 0,0 占位。
 */
function toDayItineraries(days: DayPlan[]) {
  return days.map(day => ({
    day: day.dayNumber,
    ...(day.theme ? { title: day.theme } : {}),
    pois: (day.pois ?? [])
      .filter(poi =>
        typeof poi.latitude === 'number'
        && Number.isFinite(poi.latitude)
        && typeof poi.longitude === 'number'
        && Number.isFinite(poi.longitude),
      )
      .map(poi => ({
        name: poi.name,
        lat: poi.latitude!,
        lng: poi.longitude!,
        ...(poi.type ? { category: poi.type } : {}),
      })),
  }));
}

async function processGuide(
  db: ReturnType<typeof createDb>,
  guide: Guide,
  geocodingProvider: GeocodingProvider,
): Promise<boolean> {
  log(`Processing guide: ${guide.id}`, {
    title: guide.title?.slice(0, 50),
    contentLength: guide.content?.length,
  });

  try {
    // 调用 AI
    const aiResult = await callAI(guide.content ?? '', guide.title);

    if (!aiResult) {
      return false;
    }

    // D14: AI 只提取 POI 名称，坐标由地理编码服务解析并校验。
    let geocodedDays: DayPlan[] | undefined;
    let geocodingMetrics: ReturnType<typeof buildGeocodingMetrics> = null;
    if (aiResult.aiDays && aiResult.aiDays.length > 0) {
      const city = firstDestinationName(guide.destinations);
      const { days, stats } = await geocodeAiDays(aiResult.aiDays, city, geocodingProvider);
      geocodedDays = days;
      geocodingMetrics = buildGeocodingMetrics(days);
      log(`Geocoded guide ${guide.id}`, { city: city ?? null, ...stats });
    }

    // 保存 AI 处理结果到 travel_guide_ai_data 表
    await db.insert(travelGuideAiData).values({
      guideId: guide.id,
      version: 1,
      aiSummary: aiResult.aiSummary ?? null,
      aiTags: aiResult.aiTips ?? null,
      aiCategories: null,
      aiQualityNotes: null,
      processedAt: new Date(),
    });

    // D8: 读-合并-写。aiDays 缺失时写空数组作为「已处理、无行程」标记，
    // 否则该行会被字段级筛选反复选中、无限重复消耗 AI 配额。
    const aiPatch = pickDefined({
      aiSummary: aiResult.aiSummary,
      aiTips: aiResult.aiTips,
      aiBestTime: aiResult.aiBestTime,
      aiDuration: aiResult.aiDuration,
      aiBudget: aiResult.aiBudget,
      aiDays: geocodedDays ?? [],
      contentMarkdown: aiResult.contentMarkdown,
      geocodingMetrics: geocodingMetrics ?? undefined,
    });
    const enrichedData = { ...(guide.enrichedData ?? {}), ...aiPatch };

    await db
      .update(travelGuides)
      .set({
        enrichedData,
        dayItineraries: geocodedDays ? toDayItineraries(geocodedDays) : null,
        lastUpdatedAt: new Date(),
      })
      .where(eq(travelGuides.id, guide.id));

    log(`Guide processed successfully: ${guide.id}`);
    return true;
  }
  catch (error) {
    log(`Failed to process guide: ${guide.id}`, {
      error: error instanceof Error ? error.message : error,
    });
    return false;
  }
}

async function main() {
  // 解析命令行参数
  const args = process.argv.slice(2);
  let limit = config.batchSize;
  let processAll = false;

  for (let i = 0; i < args.length; i++) {
    const next = args[i + 1];
    if (args[i] === '--limit' && next) {
      limit = Number.parseInt(next, 10);
      i++;
    }
    else if (args[i] === '--all') {
      processAll = true;
    }
  }

  // 验证配置
  if (!config.aiApiKey) {
    console.error('Error: AI_API_KEY environment variable is required');
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL environment variable is required');
    process.exit(1);
  }

  log('Starting batch AI processing', {
    aiBaseUrl: config.aiBaseUrl,
    aiModel: config.aiModel,
    limit: processAll ? 'all' : limit,
  });

  const geocodingProvider = createGeocodingProvider();
  if (!process.env.AMAP_API_KEY) {
    log('Warning: AMAP_API_KEY 未配置，POI 坐标将标记为 pending（不会写入占位坐标）');
  }

  // 创建数据库连接
  const db = createDb();

  let totalProcessed = 0;
  let totalFailed = 0;

  do {
    // D8: 字段级筛选 — 仅处理 enrichedData.aiDays 缺失的游记（DB 级过滤）。
    // 处理成功的行会写入 aiDays（至少为空数组）从而离开结果集；失败的行
    // 仍留在集合头部，用累计失败数作为 offset 跳过它们，避免死循环。
    const pendingGuides = await db
      .select({
        id: travelGuides.id,
        title: travelGuides.title,
        content: travelGuides.content,
        destinations: travelGuides.destinations,
        platform: travelGuides.platform,
        enrichedData: travelGuides.enrichedData,
      })
      .from(travelGuides)
      .where(sql`JSON_EXTRACT(${travelGuides.enrichedData}, '$.aiDays') IS NULL`)
      .orderBy(asc(travelGuides.id))
      .limit(limit)
      .offset(totalFailed);

    log(`Fetched ${pendingGuides.length} pending guides`);

    if (pendingGuides.length === 0) {
      log('No more pending guides to process');
      break;
    }

    for (const guide of pendingGuides) {
      const success = await processGuide(db, guide, geocodingProvider);

      if (success) {
        totalProcessed++;
      }
      else {
        totalFailed++;
      }

      // 延迟以避免 API 限流
      await sleep(config.delayBetweenRequests);

      // 如果不是处理全部，且已达到限制，则停止
      if (!processAll && totalProcessed + totalFailed >= limit) {
        break;
      }
    }
  } while (processAll);

  log('Batch processing complete', {
    totalProcessed,
    totalFailed,
  });
}

// 运行主程序
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
