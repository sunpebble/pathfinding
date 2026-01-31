/**
 * Stagehand Browser Utilities
 * Provides Playwright-based browser automation for crawlers
 */

import type { BrowserContext, Page } from 'playwright';
import { chromium } from 'playwright';

/**
 * Create a new browser context with default settings
 */
export async function createContext(): Promise<BrowserContext> {
  const browser = await chromium.launch({ headless: true });
  return browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
}

/**
 * Create a new page in the given context
 */
export async function createPage(context: BrowserContext): Promise<Page> {
  return context.newPage();
}

/**
 * Scroll page to load lazy-loaded content
 */
export async function scrollToLoadContent(page: Page): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.scrollBy(0, 500));
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

/**
 * Wait for a selector to appear on the page
 */
export async function waitForContent(
  page: Page,
  selector: string,
  timeout = 15000,
): Promise<void> {
  try {
    await page.waitForSelector(selector, { timeout });
  }
  catch {
    // Ignore timeout, continue with available content
  }
}

/**
 * Close all browsers (cleanup function)
 */
export async function closeBrowser(): Promise<void> {
  // Note: In Playwright, browsers are typically closed via context.close()
  // This is a no-op placeholder for compatibility
}
