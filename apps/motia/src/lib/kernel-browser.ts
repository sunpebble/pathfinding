/**
 * Kernel.sh 云浏览器工具模块
 * 提供 Stealth 模式浏览器的创建和管理
 * 使用原生 Playwright 以支持移动设备模拟绕过 WAF
 */

import type { Browser, BrowserContext, Page } from 'playwright';
import Kernel from '@onkernel/sdk';
import { chromium } from 'playwright';

// iPhone 设备配置 - 用于绕过 WAF
const IPHONE_DEVICE = {
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
};

export interface KernelBrowserSession {
  kernel: InstanceType<typeof Kernel>;
  browser: {
    session_id: string;
    cdp_ws_url: string;
    browser_live_view_url?: string;
  };
  playwrightBrowser: Browser;
  context: BrowserContext;
  page: Page;
}

export interface CreateBrowserOptions {
  stealth?: boolean;
  headless?: boolean;
  mobile?: boolean;
}

/**
 * 创建 Kernel.sh 云浏览器会话
 */
export async function createKernelBrowser(
  options: CreateBrowserOptions = {},
): Promise<KernelBrowserSession> {
  // 默认使用非 headless 模式和移动设备模拟来绕过 WAF
  const { stealth = true, headless = false, mobile = true } = options;

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

  // 使用 Playwright 直接连接
  const playwrightBrowser = await chromium.connectOverCDP(browser.cdp_ws_url);

  // 创建上下文，可选移动设备模拟
  const contextOptions = mobile
    ? {
        ...IPHONE_DEVICE,
        locale: 'zh-CN',
        extraHTTPHeaders: {
          'Accept-Language': 'zh-CN,zh;q=0.9',
        },
      }
    : {
        locale: 'zh-CN',
        extraHTTPHeaders: {
          'Accept-Language': 'zh-CN,zh;q=0.9',
        },
      };

  const context = await playwrightBrowser.newContext(contextOptions);
  const page = await context.newPage();

  return {
    kernel,
    browser,
    playwrightBrowser,
    context,
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
    await session.playwrightBrowser.close();
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
  page: Page,
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
  page: Page,
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
