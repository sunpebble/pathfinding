/**
 * 批量 AI 游记处理脚本
 *
 * 使用自定义 AI API 处理未处理的游记
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
 */

import { createDb, travelGuideAiData, travelGuides } from '@pathfinding/database';
import { eq, isNull } from 'drizzle-orm';

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
}

interface POI {
  name: string;
  type: string;
  description?: string;
  latitude: number;
  longitude: number;
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
          "latitude": 0.0,
          "longitude": 0.0,
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
1. 如果无法确定某个景点的经纬度，请使用 0.0
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

async function processGuide(
  db: ReturnType<typeof createDb>,
  guide: Guide,
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

    // 更新 enrichedData 到 travelGuides 表
    const enrichedData = {
      aiSummary: aiResult.aiSummary,
      aiTips: aiResult.aiTips,
      aiBestTime: aiResult.aiBestTime,
      aiDuration: aiResult.aiDuration,
      aiBudget: aiResult.aiBudget,
      aiDays: aiResult.aiDays,
      contentMarkdown: aiResult.contentMarkdown,
    };

    await db
      .update(travelGuides)
      .set({
        enrichedData,
        dayItineraries: aiResult.aiDays ?? null,
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
    if (args[i] === '--limit' && args[i + 1]) {
      limit = Number.parseInt(args[i + 1], 10);
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

  // 创建数据库连接
  const db = createDb();

  let totalProcessed = 0;
  let totalFailed = 0;
  let offset = 0;

  do {
    // 获取未经 AI 处理的游记（enrichedData 为 null 的）
    const pendingGuides = await db
      .select({
        id: travelGuides.id,
        title: travelGuides.title,
        content: travelGuides.content,
        destinations: travelGuides.destinations,
        platform: travelGuides.platform,
      })
      .from(travelGuides)
      .where(isNull(travelGuides.enrichedData))
      .limit(limit)
      .offset(offset);

    log(`Fetched ${pendingGuides.length} pending guides`);

    if (pendingGuides.length === 0) {
      log('No more pending guides to process');
      break;
    }

    for (const guide of pendingGuides) {
      const success = await processGuide(db, guide);

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

    offset += pendingGuides.length;
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
