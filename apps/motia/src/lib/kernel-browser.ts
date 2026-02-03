/**
 * Kernel.sh 云浏览器工具模块
 * 提供 Stealth 模式浏览器的创建和管理
 */

import { Stagehand } from '@browserbasehq/stagehand';
import Kernel from '@onkernel/sdk';

export interface KernelBrowserSession {
  kernel: InstanceType<typeof Kernel>;
  browser: {
    session_id: string;
    cdp_ws_url: string;
    browser_live_view_url?: string;
  };
  stagehand: Stagehand;
  page: Awaited<ReturnType<Stagehand['context']['pages']>>[0];
}

export interface CreateBrowserOptions {
  stealth?: boolean;
  headless?: boolean;
}

/**
 * 创建 Kernel.sh 云浏览器会话
 */
export async function createKernelBrowser(
  options: CreateBrowserOptions = {},
): Promise<KernelBrowserSession> {
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

  // 连接 Stagehand
  const stagehand = new Stagehand({
    env: 'LOCAL',
    localBrowserLaunchOptions: {
      cdpUrl: browser.cdp_ws_url,
    },
    verbose: 0,
    domSettleTimeout: 30000,
  });

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
  page: KernelBrowserSession['page'],
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
  page: KernelBrowserSession['page'],
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
