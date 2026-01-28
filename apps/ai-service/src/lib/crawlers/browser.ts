/**
 * Playwright Browser Manager
 * Shared browser instance for crawling with anti-detection measures
 */
import type { Browser, BrowserContext, Page } from 'playwright';
import { chromium } from 'playwright';

let browserInstance: Browser | null = null;

/**
 * Get or create a shared browser instance
 */
export async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.isConnected()) {
    console.log('[Browser] Launching Chromium...');
    browserInstance = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-sandbox',
      ],
    });
  }
  return browserInstance;
}

/**
 * Create a new browser context with anti-detection settings
 */
export async function createContext(): Promise<BrowserContext> {
  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    extraHTTPHeaders: {
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    },
  });

  // Inject anti-detection scripts
  await context.addInitScript(() => {
    // Override webdriver property
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });
    // Override plugins
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    });
    // Override languages
    Object.defineProperty(navigator, 'languages', {
      get: () => ['zh-CN', 'zh', 'en'],
    });
  });

  return context;
}

/**
 * Create a new page with common setup
 */
export async function createPage(context: BrowserContext): Promise<Page> {
  const page = await context.newPage();
  // Set default timeout
  page.setDefaultTimeout(30000);
  return page;
}

/**
 * Close the shared browser instance
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
    console.log('[Browser] Closed');
  }
}

/**
 * Wait for page to be fully loaded with dynamic content
 */
export async function waitForContent(
  page: Page,
  selector?: string
): Promise<void> {
  // Wait for network to be idle
  await page
    .waitForLoadState('networkidle', { timeout: 15000 })
    .catch(() => {});

  // If selector provided, wait for it
  if (selector) {
    await page.waitForSelector(selector, { timeout: 10000 }).catch(() => {});
  }

  // Additional wait for dynamic content
  await page.waitForTimeout(1000);
}

/**
 * Scroll page to load lazy content
 */
export async function scrollToLoadContent(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 300;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
      // Max scroll time
      setTimeout(() => {
        clearInterval(timer);
        resolve();
      }, 5000);
    });
  });
  // Scroll back to top
  await page.evaluate(() => window.scrollTo(0, 0));
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
