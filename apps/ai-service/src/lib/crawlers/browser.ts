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

// User agent pool for rotation
const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:122.0) Gecko/20100101 Firefox/122.0',
];

/**
 * Create a new browser context with enhanced anti-detection settings
 */
export async function createContext(): Promise<BrowserContext> {
  const browser = await getBrowser();

  // Random user agent
  const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

  // Random viewport variations
  const viewportWidth = 1920 + Math.floor(Math.random() * 100) - 50;
  const viewportHeight = 1080 + Math.floor(Math.random() * 50) - 25;

  const context = await browser.newContext({
    userAgent,
    viewport: { width: viewportWidth, height: viewportHeight },
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    deviceScaleFactor: 2,
    hasTouch: false,
    isMobile: false,
    extraHTTPHeaders: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="121", "Google Chrome";v="121"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"macOS"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
    },
  });

  // Enhanced anti-detection scripts
  await context.addInitScript(() => {
    // Override webdriver property
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });

    // More realistic plugins array
    const pluginData = [
      { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
      { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
      { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' },
    ];

    const plugins = Object.create(PluginArray.prototype);
    pluginData.forEach((p, i) => {
      const plugin = Object.create(Plugin.prototype);
      Object.defineProperties(plugin, {
        name: { value: p.name, enumerable: true },
        filename: { value: p.filename, enumerable: true },
        description: { value: p.description, enumerable: true },
        length: { value: 0, enumerable: true },
      });
      plugins[i] = plugin;
    });
    Object.defineProperty(plugins, 'length', { value: pluginData.length });

    Object.defineProperty(navigator, 'plugins', {
      get: () => plugins,
    });

    // Override languages
    Object.defineProperty(navigator, 'languages', {
      get: () => ['zh-CN', 'zh', 'en-US', 'en'],
    });

    // Override platform
    Object.defineProperty(navigator, 'platform', {
      get: () => 'MacIntel',
    });

    // Override hardware concurrency
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      get: () => 8,
    });

    // Override device memory
    Object.defineProperty(navigator, 'deviceMemory', {
      get: () => 8,
    });

    // Override permissions API
    const originalQuery = window.navigator.permissions?.query;
    if (originalQuery) {
      window.navigator.permissions.query = (parameters: PermissionDescriptor) => {
        if (parameters.name === 'notifications') {
          return Promise.resolve({ state: 'denied', onchange: null } as PermissionStatus);
        }
        return originalQuery(parameters);
      };
    }

    // Canvas fingerprint randomization
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function (
      type?: string,
      quality?: number
    ) {
      const context = this.getContext('2d');
      if (context) {
        const imageData = context.getImageData(0, 0, this.width, this.height);
        for (let i = 0; i < imageData.data.length; i += 4) {
          imageData.data[i] = imageData.data[i] ^ (Math.random() > 0.5 ? 1 : 0);
        }
        context.putImageData(imageData, 0, 0);
      }
      return originalToDataURL.call(this, type, quality);
    };

    // WebGL fingerprint protection
    const getParameterProxyHandler = {
      apply: function (
        target: (pname: number) => unknown,
        thisArg: WebGLRenderingContext,
        args: [number]
      ) {
        const param = args[0];
        // Modify some WebGL parameters
        if (param === 37445) return 'Intel Inc.'; // UNMASKED_VENDOR_WEBGL
        if (param === 37446) return 'Intel Iris OpenGL Engine'; // UNMASKED_RENDERER_WEBGL
        return Reflect.apply(target, thisArg, args);
      },
    };

    // Apply to WebGL contexts
    ['WebGLRenderingContext', 'WebGL2RenderingContext'].forEach(contextName => {
      const context = (window as any)[contextName];
      if (context && context.prototype.getParameter) {
        context.prototype.getParameter = new Proxy(context.prototype.getParameter, getParameterProxyHandler);
      }
    });

    // Randomize screen properties slightly
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    Object.defineProperty(window.screen, 'width', { get: () => screenWidth });
    Object.defineProperty(window.screen, 'height', { get: () => screenHeight });
    Object.defineProperty(window.screen, 'availWidth', { get: () => screenWidth });
    Object.defineProperty(window.screen, 'availHeight', { get: () => screenHeight - 25 });
    Object.defineProperty(window.screen, 'colorDepth', { get: () => 24 });
    Object.defineProperty(window.screen, 'pixelDepth', { get: () => 24 });
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
