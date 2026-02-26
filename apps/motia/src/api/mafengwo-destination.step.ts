/**
 * 马蜂窝目的地爬取 API
 * POST /api/crawler/mafengwo/destination
 *
 * 爬取马蜂窝目的地信息（城市/地区）
 */

import type { KernelBrowserSession } from "../lib/kernel-browser.js";
import { z } from "zod";
import {
  closeKernelBrowser,
  createKernelBrowser,
} from "../lib/kernel-browser.js";

const bodySchema = z
  .object({
    // 目的地 ID (如 "10065" 北京) 或目的地名称
    destinationId: z.string().optional(),
    destinationName: z.string().optional(),
    maxRetries: z.number().min(1).max(5).optional().default(3),
  })
  .refine(
    (data) => data.destinationId || data.destinationName,
    "Either destinationId or destinationName is required",
  );

export const config = {
  type: "api",
  name: "MafengwoDestinationCrawler",
  description: "马蜂窝目的地爬取",
  path: "/api/crawler/mafengwo/destination",
  method: "POST",
  emits: ["crawler.mafengwo.destination.completed"],
  flows: ["crawler"],
  bodySchema,
};

interface DestinationData {
  mddId: string;
  name: string;
  nameEn?: string;
  country?: string;
  province?: string;
  description?: string;
  coverImage?: string;
  images: string[];
  bestTravelTime?: string;
  avgStayDays?: string;
  climate?: string;
  travelNotesCount: number;
  poisCount: number;
  questionsCount: number;
}

interface HandlerContext {
  emit: (event: { topic: string; data: unknown }) => Promise<void>;
  logger: {
    info: (msg: string, data?: unknown) => void;
    error: (msg: string, data?: unknown) => void;
  };
}

/**
 * 从页面提取目的地信息
 */
async function extractDestinationData(
  page: KernelBrowserSession["page"],
): Promise<DestinationData> {
  return page.evaluate(() => {
    // 提取目的地 ID
    const mddIdMatch =
      window.location.href.match(
        /\/travel-scenic-spot\/mafengwo\/(\d+)\.html/,
      ) ||
      window.location.href.match(/\/mdd\/(\d+)/) ||
      window.location.href.match(/mddid=(\d+)/i);
    const mddId = mddIdMatch?.[1] || "";

    // 提取名称
    const name =
      document
        .querySelector("h1.mdd-title, .destination-title, .mdd-header h1")
        ?.textContent?.trim() ||
      document
        .querySelector('meta[property="og:title"]')
        ?.getAttribute("content")
        ?.split("-")[0]
        ?.trim() ||
      "";

    // 提取英文名
    const nameEn = document
      .querySelector(".mdd-title-en, .destination-title-en")
      ?.textContent?.trim();

    // 提取简介
    const description =
      document
        .querySelector(".mdd-summary, .destination-desc, .mdd-intro")
        ?.textContent?.trim() ||
      document
        .querySelector('meta[name="description"]')
        ?.getAttribute("content") ||
      "";

    // 提取封面图
    const coverImage =
      document
        .querySelector(".mdd-cover img, .destination-cover img")
        ?.getAttribute("src") ||
      document
        .querySelector('meta[property="og:image"]')
        ?.getAttribute("content") ||
      "";

    // 提取图片列表
    const images: string[] = [];
    document
      .querySelectorAll(
        ".mdd-photos img, .destination-photos img, .mdd-gallery img",
      )
      .forEach((img) => {
        const src = img.getAttribute("src") || img.getAttribute("data-src");
        if (src && !src.includes("icon") && !src.includes("avatar")) {
          images.push(src);
        }
      });

    // 提取最佳旅行时间
    const bestTravelTime = document
      .querySelector(".best-time, .mdd-best-time")
      ?.textContent?.trim();

    // 提取平均停留天数
    const avgStayDays = document
      .querySelector(".stay-days, .mdd-stay-days")
      ?.textContent?.trim();

    // 提取气候
    const climate = document
      .querySelector(".climate, .mdd-climate")
      ?.textContent?.trim();

    // 提取统计数据
    const pageText = document.body.textContent || "";

    // 游记数
    const notesMatch = pageText.match(
      /(\d+(?:\.\d+)?[万k]?)\s*(?:篇?游记|篇?笔记)/i,
    );
    let travelNotesCount = 0;
    if (notesMatch) {
      const val = notesMatch[1];
      if (val.includes("万")) {
        travelNotesCount = Math.round(Number.parseFloat(val) * 10000);
      } else if (val.toLowerCase().includes("k")) {
        travelNotesCount = Math.round(Number.parseFloat(val) * 1000);
      } else {
        travelNotesCount = Number.parseInt(val, 10);
      }
    }

    // POI 数
    const poisMatch = pageText.match(
      /(\d+(?:\.\d+)?[万k]?)\s*(?:个?景点|家?餐厅|家?酒店)/i,
    );
    let poisCount = 0;
    if (poisMatch) {
      const val = poisMatch[1];
      if (val.includes("万")) {
        poisCount = Math.round(Number.parseFloat(val) * 10000);
      } else if (val.toLowerCase().includes("k")) {
        poisCount = Math.round(Number.parseFloat(val) * 1000);
      } else {
        poisCount = Number.parseInt(val, 10);
      }
    }

    // 问答数
    const qaMatch = pageText.match(
      /(\d+(?:\.\d+)?[万k]?)\s*(?:个?问答|条?问题)/i,
    );
    let questionsCount = 0;
    if (qaMatch) {
      const val = qaMatch[1];
      if (val.includes("万")) {
        questionsCount = Math.round(Number.parseFloat(val) * 10000);
      } else if (val.toLowerCase().includes("k")) {
        questionsCount = Math.round(Number.parseFloat(val) * 1000);
      } else {
        questionsCount = Number.parseInt(val, 10);
      }
    }

    return {
      mddId,
      name,
      nameEn,
      description,
      coverImage,
      images,
      bestTravelTime,
      avgStayDays,
      climate,
      travelNotesCount,
      poisCount,
      questionsCount,
    };
  });
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

  const { destinationId, destinationName, maxRetries } = parseResult.data;

  // 检查环境变量
  if (!process.env.KERNEL_API_KEY) {
    logger.error("KERNEL_API_KEY not configured");
    return {
      status: 503,
      body: { success: false, error: "Browser service not configured" },
    };
  }

  let session: KernelBrowserSession | null = null;
  let lastError: string = "";

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info("Crawling destination", {
        destinationId,
        destinationName,
        attempt,
      });

      // 创建浏览器会话
      session = await createKernelBrowser({
        stealth: true,
        headless: false,
      });

      // 构建目的地 URL
      let url: string;
      if (destinationId) {
        url = `https://www.mafengwo.cn/travel-scenic-spot/mafengwo/${destinationId}.html`;
      } else {
        // 使用搜索页面
        url = `https://www.mafengwo.cn/search/s.php?q=${encodeURIComponent(destinationName!)}&t=mdd`;
      }

      logger.info("Navigating to", { url });

      // 访问页面
      await session.page.goto(url, {
        waitUntil: "domcontentloaded",
        timeoutMs: 30000,
      });

      // 等待内容加载
      await session.page.waitForTimeout(5000);

      // 如果是搜索页面，需要点击第一个结果
      if (!destinationId) {
        try {
          const firstResult = await session.page
            .locator(".search-result-item a, .result-item a")
            .first();
          if (firstResult) {
            await firstResult.click();
            await session.page.waitForTimeout(3000);
          }
        } catch {
          // 如果没有搜索结果，继续尝试提取当前页面
        }
      }

      // 提取目的地数据
      const data = await extractDestinationData(session.page);

      // 验证数据
      if (!data.name || data.name.length < 2) {
        lastError = "Failed to extract destination name";
        logger.info("Extraction failed, retrying", { attempt });
        await closeKernelBrowser(session);
        session = null;
        continue;
      }

      const sourceUrl = await session.page.url();

      logger.info("Extraction complete", {
        name: data.name,
        mddId: data.mddId,
        travelNotesCount: data.travelNotesCount,
        poisCount: data.poisCount,
      });

      // 发送完成事件
      await emit({
        topic: "crawler.mafengwo.destination.completed",
        data: {
          destination: {
            ...data,
            sourceUrl,
          },
        },
      });

      return {
        status: 200,
        body: {
          success: true,
          data: {
            ...data,
            sourceUrl,
          },
        },
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Crawl failed";
      logger.error("Destination crawl attempt failed", {
        error: lastError,
        attempt,
      });
    } finally {
      if (session) {
        await closeKernelBrowser(session);
        session = null;
      }
    }
  }

  // 所有重试都失败
  logger.error("All retries failed", {
    destinationId,
    destinationName,
    lastError,
  });

  return {
    status: 500,
    body: { success: false, error: lastError },
  };
}
