/**
 * Kernel.sh 云浏览器工具模块
 * 提供 Stealth 模式浏览器的创建和管理
 * 支持 Stagehand（可选 AI 提取）
 */

import { Stagehand } from '@browserbasehq/stagehand';
import Kernel from '@onkernel/sdk';
import { z } from 'zod';

// 使用 Stagehand 内部的 Page 类型
type StagehandPage = ReturnType<Stagehand['context']['pages']>[0];

export interface KernelBrowserSession {
  kernel: InstanceType<typeof Kernel>;
  browser: {
    session_id: string;
    cdp_ws_url: string;
    browser_live_view_url?: string;
  };
  stagehand: Stagehand;
  page: StagehandPage;
}

export interface CreateBrowserOptions {
  stealth?: boolean;
  headless?: boolean;
}

/**
 * 创建 Kernel.sh 云浏览器会话 (使用 Stagehand)
 */
export async function createKernelBrowser(
  options: CreateBrowserOptions = {},
): Promise<KernelBrowserSession> {
  // 默认使用非 headless 模式来绕过 WAF
  const { stealth = true, headless = false } = options;

  // 检查环境变量
  if (!process.env.KERNEL_API_KEY) {
    throw new Error('KERNEL_API_KEY environment variable is not set');
  }

  const kernel = new Kernel();

  // 创建 Kernel 云浏览器
  const browser = await kernel.browsers.create({
    stealth,
    headless,
  });

  // 配置 Stagehand 选项
  // eslint-disable-next-line ts/no-explicit-any
  const stagehandOptions: any = {
    env: 'LOCAL',
    localBrowserLaunchOptions: {
      cdpUrl: browser.cdp_ws_url,
    },
    verbose: 0,
    domSettleTimeout: 30000,
  };

  // 配置 AI 模型（可选，用于 AI 提取功能）
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL) {
    stagehandOptions.model = {
      modelName: process.env.OPENAI_MODEL,
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL,
    };
  }

  const stagehand = new Stagehand(stagehandOptions);

  await stagehand.init();
  const page = stagehand.context.pages()[0];

  return {
    kernel,
    browser,
    stagehand,
    page,
  };
}

/**
 * 释放浏览器资源
 */
export async function closeKernelBrowser(
  session: KernelBrowserSession,
): Promise<void> {
  try {
    await session.stagehand.close();
  }
  catch {
    // ignore close errors
  }

  try {
    await session.kernel.browsers.deleteByID(session.browser.session_id);
  }
  catch {
    // ignore delete errors
  }
}

/**
 * 在页面上滚动加载更多内容
 */
export async function scrollToLoadMore(
  page: StagehandPage,
  scrollCount: number = 5,
  delayMs: number = 2000,
): Promise<void> {
  for (let i = 0; i < scrollCount; i++) {
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(delayMs);
  }
}

/**
 * 提取页面上的游记链接
 */
export async function extractGuideUrls(
  page: StagehandPage,
): Promise<string[]> {
  const urls = await page.evaluate(() => {
    const links = new Set<string>();
    const anchors = document.querySelectorAll('a[href*="/i/"]');
    anchors.forEach((a) => {
      const href = (a as HTMLAnchorElement).href;
      // 匹配 /i/数字.html 格式
      if (/\/i\/\d+\.html/.test(href)) {
        links.add(href);
      }
    });
    return Array.from(links);
  });
  return urls;
}

/**
 * 游记详情的 Schema (用于 AI 提取)
 */
export const TravelGuideSchema = z.object({
  title: z.string().describe('游记的完整标题'),
  content: z.string().describe('游记的完整正文内容，包括所有段落和描述，不要截断，不要包含作者个人信息'),
  author: z.string().optional().describe('作者名称（仅名称，不含个人简介）'),
  destination: z.string().optional().describe('主要目的地/旅行地点'),
  travelDays: z.string().optional().describe('行程天数，如 "7天"'),
  highlights: z.array(z.string()).optional().describe('游记中提到的主要景点或亮点'),
});

export type TravelGuideData = z.infer<typeof TravelGuideSchema>;

/**
 * 使用 AI 提取游记详情（需要配置 OPENAI_API_KEY 和 OPENAI_MODEL）
 */
export async function extractGuideWithAI(
  stagehand: Stagehand,
  instruction?: string,
): Promise<TravelGuideData> {
  const defaultInstruction = `
提取这篇旅游游记的内容。要求：
1. title: 游记的完整标题
2. content: 游记的完整正文内容，包括所有旅行描述、景点介绍、行程安排等。
   - 不要包含作者的个人简介（如微博、微信号等）
   - 不要包含推荐游记
   - 不要包含版权声明
   - 保持段落完整
3. author: 仅提取作者名字
4. destination: 主要目的地
5. travelDays: 行程天数
6. highlights: 提到的主要景点列表
`;

  const result = await stagehand.extract(
    instruction || defaultInstruction,
    TravelGuideSchema,
  );

  return result;
}

/**
 * 使用 DOM 选择器提取游记详情（更稳定，无需 AI）
 */
export async function extractGuideWithSelectors(
  page: StagehandPage,
): Promise<{
  title: string;
  content: string;
  author?: string;
  views?: string;
  likes?: string;
  coverImage?: string;
  images: string[];
}> {
  return page.evaluate(() => {
    // 提取标题 - 从 meta 或页面标题获取
    const title
      = document.querySelector('meta[property="og:title"]')?.getAttribute('content')
        || document.title.split('，')[0].split('|')[0].trim()
        || '';

    // 提取内容 - 优先使用 .chapter-container (纯正文)
    let content = '';
    const chapterEl = document.querySelector('.chapter-container');
    if (chapterEl) {
      content = chapterEl.textContent?.trim() || '';
    }
    else {
      // 回退到 .note-content 但需要清洗
      const noteContent = document.querySelector('.note-content, .note-body');
      if (noteContent) {
        const clone = noteContent.cloneNode(true) as HTMLElement;
        // 移除不需要的元素
        clone.querySelectorAll('.copyright, .recommend-note, .accusation-container, [class*="author"], [class*="avatar"], [class*="ad-container"]').forEach((el) => {
          el.remove();
        });
        content = clone.textContent?.trim() || '';
      }
    }

    // 清洗内容
    content = content
      .replace(/图片占位符/g, '')
      .replace(/\s+/g, ' ')
      .replace(/加载更多内容/g, '')
      .trim();

    // 提取作者
    const author
      = document.querySelector('.note-content > div:first-child p')?.textContent?.trim().split('\n')[0]
        || document.querySelector('meta[name="author"]')?.getAttribute('content')
        || undefined;

    // 提取浏览量
    const pageText = document.body.textContent || '';
    const viewsMatch = pageText.match(/(\d+(?:\.\d+)?[万k]?)\s*(?:浏览|阅读)/i);
    const views = viewsMatch?.[1] || undefined;

    // 提取点赞
    const likesMatch = pageText.match(/(\d+(?:\.\d+)?[万k]?)\s*(?:赞|喜欢)/i);
    const likes = likesMatch?.[1] || undefined;

    // 提取图片
    const images: string[] = [];
    document.querySelectorAll('.chapter-container img[src*="mafengwo"], .note-content img[src*="mafengwo"]').forEach((img) => {
      const src = (img as HTMLImageElement).src || img.getAttribute('data-src');
      if (src && !src.includes('avatar') && !src.includes('icon') && !src.includes('recommend')) {
        images.push(src);
      }
    });

    // 提取封面图
    const coverImage
      = document.querySelector('meta[property="og:image"]')?.getAttribute('content')
        || images[0]
        || undefined;

    return {
      title,
      content,
      author,
      views,
      likes,
      coverImage,
      images,
    };
  });
}
