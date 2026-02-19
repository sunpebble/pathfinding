/**
 * 马蜂窝 POI 爬取 API
 * POST /api/crawler/mafengwo/poi
 *
 * 爬取马蜂窝景点/餐厅/酒店信息
 */

import type { KernelBrowserSession } from "../lib/kernel-browser.js";
import { z } from "zod";
import {
  closeKernelBrowser,
  createKernelBrowser,
  scrollToLoadMore,
} from "../lib/kernel-browser.js";

const poiCategorySchema = z.enum([
  "attraction", // 景点
  "restaurant", // 餐厅
  "hotel", // 酒店
  "shopping", // 购物
]);

const bodySchema = z.object({
  // 爬取模式：list 列表 或 detail 详情
  mode: z.enum(["list", "detail"]).default("list"),
  // 目的地 ID
  destinationId: z.string().optional(),
  destinationName: z.string().optional(),
  // POI 类别
  category: poiCategorySchema.optional().default("attraction"),
  // 详情模式需要 POI URL
  poiUrl: z.string().url().optional(),
  // 列表参数
  scrollCount: z.number().min(1).max(20).optional().default(5),
  maxRetries: z.number().min(1).max(5).optional().default(3),
});

export const config = {
  type: "api",
  name: "MafengwoPoiCrawler",
  description: "马蜂窝POI爬取",
  path: "/api/crawler/mafengwo/poi",
  method: "POST",
  emits: [
    "crawler.mafengwo.poi.list.completed",
    "crawler.mafengwo.poi.detail.completed",
  ],
  flows: ["crawler"],
  bodySchema,
};

interface POIListItem {
  poiId: string;
  name: string;
  url: string;
  rating?: number;
  category?: string;
  coverImage?: string;
  address?: string;
}

interface POIDetail {
  poiId: string;
  name: string;
  nameEn?: string;
  category: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  ratingCount: number;
  priceRange?: string;
  ticketPrice?: string;
  openingHours?: string;
  phone?: string;
  description?: string;
  tips: string[];
  highlights: string[];
  coverImage?: string;
  images: string[];
  reviewsCount: number;
  savesCount: number;
  tags: string[];
  // Restaurant specific
  cuisineType?: string;
  signatureDishes: string[];
  // Hotel specific
  starRating?: number;
  amenities: string[];
}

interface HandlerContext {
  emit: (event: { topic: string; data: unknown }) => Promise<void>;
  logger: {
    info: (msg: string, data?: unknown) => void;
    error: (msg: string, data?: unknown) => void;
  };
}

/**
 * 提取 POI 列表
 */
async function extractPOIList(
  page: KernelBrowserSession["page"],
  category: string,
): Promise<POIListItem[]> {
  return page.evaluate((cat) => {
    const items: POIListItem[] = [];

    // 通用 POI 列表选择器
    const selectors = [
      ".poi-list-item",
      ".jingdian-item",
      ".hotel-item",
      ".restaurant-item",
      ".scenic-item",
      ".poi-card",
      "[data-poi-id]",
    ];

    for (const selector of selectors) {
      document.querySelectorAll(selector).forEach((el) => {
        const link = el.querySelector('a[href*="/poi/"]') as HTMLAnchorElement;
        if (!link) return;

        const href = link.href;
        const poiIdMatch = href.match(/\/poi\/(\d+)\.html/);
        if (!poiIdMatch) return;

        const name =
          el.querySelector(".title, .name, h3, h4")?.textContent?.trim() || "";
        const ratingEl = el.querySelector(".score, .rating");
        const ratingText = ratingEl?.textContent?.trim() || "";
        const rating = Number.parseFloat(ratingText) || undefined;

        const coverImage =
          el.querySelector("img")?.getAttribute("src") ||
          el.querySelector("img")?.getAttribute("data-src");

        const address = el
          .querySelector(".address, .location")
          ?.textContent?.trim();

        items.push({
          poiId: poiIdMatch[1],
          name,
          url: href,
          rating,
          category: cat,
          coverImage: coverImage || undefined,
          address,
        });
      });

      if (items.length > 0) break;
    }

    // 如果上面都没有，尝试从链接提取
    if (items.length === 0) {
      document.querySelectorAll('a[href*="/poi/"]').forEach((a) => {
        const href = (a as HTMLAnchorElement).href;
        const match = href.match(/\/poi\/(\d+)\.html/);
        if (match) {
          const name = a.textContent?.trim() || "";
          if (name.length > 1) {
            items.push({
              poiId: match[1],
              name,
              url: href,
              category: cat,
            });
          }
        }
      });
    }

    // 去重
    const seen = new Set<string>();
    return items.filter((item) => {
      if (seen.has(item.poiId)) return false;
      seen.add(item.poiId);
      return true;
    });
  }, category);
}

/**
 * 提取 POI 详情
 */
async function extractPOIDetail(
  page: KernelBrowserSession["page"],
): Promise<POIDetail> {
  return page.evaluate(() => {
    // 提取 POI ID
    const urlMatch = window.location.href.match(/\/poi\/(\d+)\.html/);
    const poiId = urlMatch?.[1] || "";

    // 提取名称
    const name =
      document
        .querySelector("h1.poi-title, .title h1, .poi-name")
        ?.textContent?.trim() ||
      document
        .querySelector('meta[property="og:title"]')
        ?.getAttribute("content")
        ?.split("-")[0]
        ?.trim() ||
      "";

    // 提取英文名
    const nameEn = document
      .querySelector(".poi-title-en, .title-en")
      ?.textContent?.trim();

    // 提取类别
    const categoryEl = document.querySelector(".poi-type, .category");
    const category = categoryEl?.textContent?.trim() || "attraction";

    // 提取地址
    const address = document
      .querySelector(".poi-address, .address")
      ?.textContent?.trim()
      ?.replace(/地址[：:]/g, "")
      .trim();

    // 提取坐标 (from meta or script)
    let latitude: number | undefined;
    let longitude: number | undefined;
    const scripts = document.querySelectorAll("script");
    scripts.forEach((script) => {
      const text = script.textContent || "";
      const latMatch = text.match(/lat[itude]*['":\s]+([0-9.]+)/i);
      const lngMatch = text.match(/lng|lon[gitude]*['":\s]+([0-9.]+)/i);
      if (latMatch) latitude = Number.parseFloat(latMatch[1]);
      if (lngMatch) longitude = Number.parseFloat(lngMatch[1]);
    });

    // 提取评分
    const ratingText = document
      .querySelector(".score, .rating-score, .poi-score")
      ?.textContent?.trim();
    const rating = ratingText ? Number.parseFloat(ratingText) : undefined;

    // 提取评价数
    const ratingCountText = document
      .querySelector(".rating-count, .review-count")
      ?.textContent?.trim();
    const ratingCountMatch = ratingCountText?.match(/(\d+)/);
    const ratingCount = ratingCountMatch
      ? Number.parseInt(ratingCountMatch[1], 10)
      : 0;

    // 提取价格
    const priceRange = document
      .querySelector(".price-range, .average-price")
      ?.textContent?.trim();
    const ticketPrice = document
      .querySelector(".ticket-price, .admission")
      ?.textContent?.trim();

    // 提取营业时间
    const openingHours = document
      .querySelector(".opening-hours, .business-hours")
      ?.textContent?.trim()
      ?.replace(/营业时间[：:]/g, "")
      .trim();

    // 提取电话
    const phone = document
      .querySelector(".phone, .tel")
      ?.textContent?.trim()
      ?.replace(/电话[：:]/g, "")
      .trim();

    // 提取简介
    const description = document
      .querySelector(".poi-intro, .introduction, .summary")
      ?.textContent?.trim();

    // 提取贴士
    const tips: string[] = [];
    document
      .querySelectorAll(".tips li, .poi-tips p, .travel-tips li")
      .forEach((el) => {
        const tip = el.textContent?.trim();
        if (tip && tip.length > 5) {
          tips.push(tip);
        }
      });

    // 提取亮点
    const highlights: string[] = [];
    document.querySelectorAll(".highlight, .feature, .tag").forEach((el) => {
      const text = el.textContent?.trim();
      if (text && text.length > 1 && text.length < 50) {
        highlights.push(text);
      }
    });

    // 提取图片
    const images: string[] = [];
    document
      .querySelectorAll(".poi-photos img, .gallery img, .photo-list img")
      .forEach((img) => {
        const src = img.getAttribute("src") || img.getAttribute("data-src");
        if (
          src &&
          !src.includes("icon") &&
          !src.includes("avatar") &&
          !src.includes("logo")
        ) {
          images.push(src);
        }
      });

    const coverImage =
      document
        .querySelector('meta[property="og:image"]')
        ?.getAttribute("content") || images[0];

    // 提取收藏数
    const savesText = document
      .querySelector(".saves-count, .collect-count")
      ?.textContent?.trim();
    const savesMatch = savesText?.match(/(\d+)/);
    const savesCount = savesMatch ? Number.parseInt(savesMatch[1], 10) : 0;

    // 提取评论数
    const reviewsText = document
      .querySelector(".reviews-count, .comment-count")
      ?.textContent?.trim();
    const reviewsMatch = reviewsText?.match(/(\d+)/);
    const reviewsCount = reviewsMatch
      ? Number.parseInt(reviewsMatch[1], 10)
      : 0;

    // 提取标签
    const tags: string[] = [];
    document.querySelectorAll(".poi-tags span, .tags a").forEach((el) => {
      const tag = el.textContent?.trim();
      if (tag && tag.length > 1) {
        tags.push(tag);
      }
    });

    // 餐厅特有字段
    const cuisineType = document
      .querySelector(".cuisine-type, .food-type")
      ?.textContent?.trim();
    const signatureDishes: string[] = [];
    document
      .querySelectorAll(".signature-dish, .recommended-dish")
      .forEach((el) => {
        const dish = el.textContent?.trim();
        if (dish) {
          signatureDishes.push(dish);
        }
      });

    // 酒店特有字段
    const starEl = document.querySelector(".hotel-star, .star-rating");
    const starText =
      starEl?.textContent?.trim() || starEl?.getAttribute("data-star");
    const starRating = starText ? Number.parseInt(starText, 10) : undefined;

    const amenities: string[] = [];
    document.querySelectorAll(".amenity, .facility").forEach((el) => {
      const text = el.textContent?.trim();
      if (text) {
        amenities.push(text);
      }
    });

    return {
      poiId,
      name,
      nameEn,
      category,
      address,
      latitude,
      longitude,
      rating,
      ratingCount,
      priceRange,
      ticketPrice,
      openingHours,
      phone,
      description,
      tips,
      highlights,
      coverImage,
      images,
      reviewsCount,
      savesCount,
      tags,
      cuisineType,
      signatureDishes,
      starRating,
      amenities,
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

  const {
    mode,
    destinationId,
    destinationName,
    category,
    poiUrl,
    scrollCount,
    maxRetries,
  } = parseResult.data;

  // 验证参数
  if (mode === "list" && !destinationId && !destinationName) {
    return {
      status: 400,
      body: {
        success: false,
        error: "destinationId or destinationName required for list mode",
      },
    };
  }

  if (mode === "detail" && !poiUrl) {
    return {
      status: 400,
      body: { success: false, error: "poiUrl required for detail mode" },
    };
  }

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
      logger.info("Crawling POI", {
        mode,
        category,
        destinationId,
        poiUrl,
        attempt,
      });

      // 创建浏览器会话
      session = await createKernelBrowser({
        stealth: true,
        headless: false,
      });

      if (mode === "list") {
        // 列表模式
        const categoryPath =
          {
            attraction: "jd",
            restaurant: "cy",
            hotel: "hotel",
            shopping: "gw",
          }[category] || "jd";

        let url: string;
        if (destinationId) {
          url = `https://www.mafengwo.cn/${categoryPath}/${destinationId}/gonglve.html`;
        } else {
          // 搜索模式
          url = `https://www.mafengwo.cn/search/s.php?q=${encodeURIComponent(destinationName!)}&t=${categoryPath}`;
        }

        logger.info("Navigating to POI list", { url });

        await session.page.goto(url, {
          waitUntil: "domcontentloaded",
          timeoutMs: 30000,
        });

        await session.page.waitForTimeout(3000);

        // 滚动加载更多
        await scrollToLoadMore(session.page, scrollCount, 2000);

        // 提取 POI 列表
        const items = await extractPOIList(session.page, category);

        logger.info("POI list extraction complete", { count: items.length });

        // 发送完成事件
        await emit({
          topic: "crawler.mafengwo.poi.list.completed",
          data: {
            destinationId,
            destinationName,
            category,
            items,
            count: items.length,
          },
        });

        return {
          status: 200,
          body: {
            success: true,
            mode: "list",
            category,
            items,
            count: items.length,
          },
        };
      } else {
        // 详情模式
        const mobileUrl = poiUrl!.replace("www.mafengwo.cn", "m.mafengwo.cn");

        logger.info("Navigating to POI detail", { url: mobileUrl });

        await session.page.goto(mobileUrl, {
          waitUntil: "domcontentloaded",
          timeoutMs: 30000,
        });

        await session.page.waitForTimeout(5000);

        // 提取 POI 详情
        const data = await extractPOIDetail(session.page);

        if (!data.name || data.name.length < 2) {
          lastError = "Failed to extract POI name";
          logger.info("Extraction failed, retrying", { attempt });
          await closeKernelBrowser(session);
          session = null;
          continue;
        }

        logger.info("POI detail extraction complete", {
          name: data.name,
          poiId: data.poiId,
          rating: data.rating,
        });

        // 发送完成事件
        await emit({
          topic: "crawler.mafengwo.poi.detail.completed",
          data: {
            sourceUrl: poiUrl,
            poi: data,
          },
        });

        return {
          status: 200,
          body: {
            success: true,
            mode: "detail",
            data,
          },
        };
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Crawl failed";
      logger.error("POI crawl attempt failed", { error: lastError, attempt });
    } finally {
      if (session) {
        await closeKernelBrowser(session);
        session = null;
      }
    }
  }

  // 所有重试都失败
  logger.error("All retries failed", { mode, category, lastError });

  return {
    status: 500,
    body: { success: false, error: lastError },
  };
}
