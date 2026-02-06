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
 *   CONVEX_URL - Convex 部署 URL
 *   AI_BASE_URL - AI API 基础 URL (默认: https://o.kunish.org)
 *   AI_API_KEY - AI API 密钥
 *   AI_MODEL - 使用的模型 (默认: gemini-3-pro-high)
 */

import type { Id } from '../convex/_generated/dataModel';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api';

// ============================================
// 配置
// ============================================

const config = {
  convexUrl: process.env.CONVEX_URL || 'https://convex.kunish.org',
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
  _id: Id<'travelGuides'>;
  title?: string;
  content: string;
  destinations: string[];
  sourcePlatform: string;
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
  client: ConvexHttpClient,
  guide: Guide,
): Promise<boolean> {
  log(`Processing guide: ${guide._id}`, {
    title: guide.title?.slice(0, 50),
    contentLength: guide.content?.length,
  });

  // 标记为处理中
  await client.mutation(api.travelGuides.updateEnrichmentStatus, {
    id: guide._id,
    status: 'processing',
  });

  try {
    // 调用 AI
    const aiResult = await callAI(guide.content, guide.title);

    if (!aiResult) {
      // 标记为失败
      await client.mutation(api.travelGuides.updateEnrichmentStatus, {
        id: guide._id,
        status: 'failed',
        error: 'AI processing returned null',
      });
      return false;
    }

    // 保存结果
    await client.mutation(api.migrations.batchAiProcess.updateAiData, {
      guideId: guide._id,
      aiSummary: aiResult.aiSummary,
      aiTips: aiResult.aiTips,
      aiBestTime: aiResult.aiBestTime,
      aiDuration: aiResult.aiDuration,
      aiBudget: aiResult.aiBudget,
      aiDays: aiResult.aiDays,
    });

    log(`Guide processed successfully: ${guide._id}`);
    return true;
  }
  catch (error) {
    log(`Failed to process guide: ${guide._id}`, {
      error: error instanceof Error ? error.message : error,
    });

    // 标记为失败
    await client.mutation(api.travelGuides.updateEnrichmentStatus, {
      id: guide._id,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
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

  log('Starting batch AI processing', {
    aiBaseUrl: config.aiBaseUrl,
    aiModel: config.aiModel,
    limit: processAll ? 'all' : limit,
  });

  // 创建 Convex 客户端
  const client = new ConvexHttpClient(config.convexUrl);

  let cursor: string | undefined;
  let totalProcessed = 0;
  let totalFailed = 0;

  do {
    // 获取待处理的游记
    const result = await client.query(
      api.migrations.batchAiProcess.getPending,
      {
        cursor,
        limit,
      },
    );

    log(`Fetched ${result.guides.length} pending guides`, {
      totalInBatch: result.totalInBatch,
      pendingInBatch: result.pendingInBatch,
      isDone: result.isDone,
    });

    if (result.guides.length === 0) {
      if (result.isDone) {
        log('No more pending guides to process');
        break;
      }
      cursor = result.nextCursor;
      continue;
    }

    // 获取完整游记内容
    for (const guideMeta of result.guides) {
      const fullGuide = await client.query(api.travelGuides.getById, {
        id: guideMeta._id,
      });

      if (!fullGuide) {
        log(`Guide not found: ${guideMeta._id}`);
        continue;
      }

      const success = await processGuide(client, {
        _id: fullGuide._id,
        title: fullGuide.title,
        content: fullGuide.content,
        destinations: fullGuide.destinations,
        sourcePlatform: fullGuide.sourcePlatform,
      });

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

    cursor = result.nextCursor;
  } while (processAll && cursor);

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
