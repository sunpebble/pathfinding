/**
 * 马蜂窝批量爬取调度器
 * POST /api/crawler/mafengwo/batch
 *
 * 全面爬取指定目的地的所有数据类型
 */

import { z } from "zod";

const bodySchema = z.object({
  // 目的地配置
  destinations: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string(),
      }),
    )
    .min(1)
    .max(50),
  // 要爬取的数据类型
  dataTypes: z
    .array(
      z.enum([
        "destination", // 目的地信息
        "travel_notes", // 游记
        "pois", // POI（景点/餐厅/酒店）
        "guides", // 攻略
        "qa", // 问答
        "rankings", // 榜单
      ]),
    )
    .optional()
    .default(["destination", "travel_notes", "pois", "guides"]),
  // POI 类别
  poiCategories: z
    .array(z.enum(["attraction", "restaurant", "hotel", "shopping"]))
    .optional()
    .default(["attraction", "restaurant"]),
  // 榜单类型
  rankingTypes: z
    .array(z.enum(["must_visit", "food", "hotel", "shopping", "hidden_gem"]))
    .optional()
    .default(["must_visit", "food"]),
  // 每种类型的列表爬取数量
  scrollCount: z.number().min(1).max(20).optional().default(5),
  // 是否爬取详情
  crawlDetails: z.boolean().optional().default(true),
  // 详情爬取数量限制（每种类型）
  detailsLimit: z.number().min(1).max(100).optional().default(20),
  // 优先级
  priority: z.number().min(1).max(10).optional().default(5),
});

export const config = {
  type: "api",
  name: "MafengwoBatchCrawler",
  description: "马蜂窝批量爬取调度器",
  path: "/api/crawler/mafengwo/batch",
  method: "POST",
  emits: [
    "crawler.mafengwo.batch.started",
    "crawler.mafengwo.batch.task.created",
  ],
  flows: ["crawler"],
  bodySchema,
};

interface CrawlTask {
  taskType: string;
  destinationId?: string;
  destinationName: string;
  config: Record<string, unknown>;
  priority: number;
}

interface HandlerContext {
  emit: (event: { topic: string; data: unknown }) => Promise<void>;
  logger: {
    info: (msg: string, data?: unknown) => void;
    error: (msg: string, data?: unknown) => void;
  };
}

export async function handler(
  req: { body?: unknown },
  { emit, logger }: HandlerContext,
) {
  // 验证请求参数
  const parseResult = bodySchema.safeParse(req.body);
  if (!parseResult.success) {
    return {
      status: 400,
      body: { success: false, error: parseResult.error.message },
    };
  }

  const {
    destinations,
    dataTypes,
    poiCategories,
    rankingTypes,
    scrollCount,
    crawlDetails,
    detailsLimit,
    priority,
  } = parseResult.data;

  const tasks: CrawlTask[] = [];
  const batchId = `batch_${Date.now()}`;

  logger.info("Creating batch crawl tasks", {
    batchId,
    destinationsCount: destinations.length,
    dataTypes,
  });

  // 为每个目的地创建爬取任务
  for (const dest of destinations) {
    const destId = dest.id;
    const destName = dest.name;

    // 1. 目的地信息
    if (dataTypes.includes("destination")) {
      tasks.push({
        taskType: "destination_detail",
        destinationId: destId,
        destinationName: destName,
        config: {
          destinationId: destId,
          destinationName: destName,
        },
        priority: priority + 2, // 目的地信息优先级最高
      });
    }

    // 2. 游记
    if (dataTypes.includes("travel_notes")) {
      // 游记列表
      tasks.push({
        taskType: "travel_note_list",
        destinationId: destId,
        destinationName: destName,
        config: {
          city: destName,
          scrollCount,
        },
        priority,
      });
    }

    // 3. POI
    if (dataTypes.includes("pois")) {
      for (const category of poiCategories) {
        // POI 列表
        tasks.push({
          taskType: "poi_list",
          destinationId: destId,
          destinationName: destName,
          config: {
            destinationId: destId,
            destinationName: destName,
            category,
            scrollCount,
          },
          priority: priority - 1,
        });
      }
    }

    // 4. 攻略
    if (dataTypes.includes("guides")) {
      tasks.push({
        taskType: "guide_list",
        destinationId: destId,
        destinationName: destName,
        config: {
          destinationId: destId,
          destinationName: destName,
          scrollCount,
        },
        priority,
      });
    }

    // 5. 问答
    if (dataTypes.includes("qa")) {
      tasks.push({
        taskType: "qa_list",
        destinationId: destId,
        destinationName: destName,
        config: {
          destinationId: destId,
          destinationName: destName,
          scrollCount,
        },
        priority: priority - 2,
      });
    }

    // 6. 榜单
    if (dataTypes.includes("rankings")) {
      for (const rankingType of rankingTypes) {
        tasks.push({
          taskType: "ranking",
          destinationId: destId,
          destinationName: destName,
          config: {
            destinationId: destId,
            destinationName: destName,
            rankingType,
          },
          priority: priority - 1,
        });
      }
    }
  }

  // 发送批量任务开始事件
  await emit({
    topic: "crawler.mafengwo.batch.started",
    data: {
      batchId,
      totalTasks: tasks.length,
      destinations: destinations.map((d) => d.name),
      dataTypes,
      crawlDetails,
      detailsLimit,
    },
  });

  // 发送每个任务创建事件
  for (const task of tasks) {
    await emit({
      topic: "crawler.mafengwo.batch.task.created",
      data: {
        batchId,
        task,
      },
    });
  }

  logger.info("Batch crawl tasks created", {
    batchId,
    totalTasks: tasks.length,
  });

  return {
    status: 200,
    body: {
      success: true,
      batchId,
      totalTasks: tasks.length,
      tasks: tasks.map((t) => ({
        taskType: t.taskType,
        destinationName: t.destinationName,
        priority: t.priority,
      })),
      message: `Created ${tasks.length} crawl tasks for ${destinations.length} destinations`,
    },
  };
}
