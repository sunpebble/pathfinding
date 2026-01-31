import type { Browser, BrowserContext, Page } from 'playwright';
import type {
  BrowserClient,
  NetworkRequest,
  PageSnapshot,
  SessionOptions,
} from './types';
import Kernel from '@onkernel/sdk';
import {

  chromium,

} from 'playwright';
import { createLogger } from '../../logger.js';

const log = createLogger('kernel-client');

/**
 * Kernel Browser Client - Cloud browser infrastructure for AI agents
 *
 * Uses Kernel.sh (onkernel.com) for anti-bot detection, reusable sessions,
 * and autoscaling browsers. Connects via CDP (Chrome DevTools Protocol).
 *
 * Environment variables:
 * - KERNEL_API_KEY: API key for Kernel (set automatically by SDK)
 */
export class KernelBrowserClient implements BrowserClient {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private options: SessionOptions = {};
  private networkRequests: Map<string, NetworkRequest> = new Map();
  private capturePatterns: string[] = [];
  private networkCaptureEnabled = false;
  private requestIdCounter = 0;
  private kernelBrowser: any = null;

  /**
   * Initialize the browser session with Kernel SDK
   */
  async init(options?: SessionOptions): Promise<void> {
    this.options = options || {};

    log.info('Creating cloud browser via SDK...');

    // Create Kernel instance - SDK reads KERNEL_API_KEY from env
    const kernel = new Kernel();

    // Create a browser with options
    this.kernelBrowser = await kernel.browsers.create({
      stealth: true,
      headless: this.options.headless !== false,
    });

    const cdpWsUrl = this.kernelBrowser.cdp_ws_url;
    log.info({ sessionId: this.kernelBrowser.session_id }, 'Browser created');
    log.info('Connecting via CDP...');

    // Connect to the browser via CDP
    this.browser = await chromium.connectOverCDP(cdpWsUrl);

    // Get or create context
    const contexts = this.browser.contexts();
    this.context
      = contexts.length > 0
        ? contexts[0]
        : await this.browser.newContext({
            viewport: this.options.viewport || { width: 1920, height: 1080 },
            userAgent:
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          });

    // Get or create page
    const pages = this.context.pages();
    this.page = pages.length > 0 ? pages[0] : await this.context.newPage();

    log.info('Browser ready');
  }

  /**
   * Close the browser session and clean up resources
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
    }

    // Kernel browsers auto-terminate after disconnect
    if (this.kernelBrowser) {
      log.info(
        { sessionId: this.kernelBrowser.session_id },
        'Browser disconnected',
      );
      this.kernelBrowser = null;
    }

    this.networkRequests.clear();
    this.capturePatterns = [];
    this.networkCaptureEnabled = false;
  }

  /**
   * Navigate to a URL
   */
  async navigateTo(
    url: string,
    options?: {
      timeout?: number;
      waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
    },
  ): Promise<void> {
    this.ensureInitialized();
    await this.page!.goto(url, {
      timeout: options?.timeout || 60000,
      waitUntil: options?.waitUntil || 'domcontentloaded',
    });
  }

  /**
   * Take a snapshot of the current page
   */
  async takeSnapshot(options?: { verbose?: boolean }): Promise<PageSnapshot> {
    this.ensureInitialized();

    const content = await this.page!.content();
    const url = this.page!.url();

    if (options?.verbose) {
      log.warn({ url, contentLength: content.length }, 'Snapshot taken');
    }

    return {
      content,
      url,
      timestamp: new Date(),
    };
  }

  /**
   * Get the current page content
   */
  async getPageContent(): Promise<string> {
    this.ensureInitialized();
    return await this.page!.content();
  }

  /**
   * Enable network request capture with optional URL patterns
   */
  async enableNetworkCapture(patterns?: string[]): Promise<void> {
    this.ensureInitialized();

    this.capturePatterns = patterns || ['**/*'];
    this.networkCaptureEnabled = true;

    // Set up request interception
    this.page!.on('request', (request) => {
      if (this.shouldCaptureRequest(request.url())) {
        const id = `req_${++this.requestIdCounter}`;
        this.networkRequests.set(id, {
          id,
          url: request.url(),
          method: request.method(),
          requestHeaders: request.headers(),
          responseHeaders: {},
          resourceType: request.resourceType(),
          status: 0,
          responseBody: null,
        });
      }
    });

    this.page!.on('response', async (response) => {
      const request = response.request();
      if (this.shouldCaptureRequest(request.url())) {
        // Find and update the matching request
        for (const [_id, req] of this.networkRequests) {
          if (req.url === request.url() && req.status === 0) {
            req.status = response.status();
            req.responseHeaders = response.headers();
            break;
          }
        }
      }
    });
  }

  /**
   * List captured network requests, optionally filtered by resource types
   */
  async listNetworkRequests(types?: string[]): Promise<NetworkRequest[]> {
    if (!this.networkCaptureEnabled) {
      throw new Error(
        'Network capture not enabled. Call enableNetworkCapture() first.',
      );
    }

    const requests = Array.from(this.networkRequests.values());

    if (types && types.length > 0) {
      return requests.filter(req => types.includes(req.resourceType));
    }

    return requests;
  }

  /**
   * Get a specific network request by ID
   */
  async getNetworkRequest(id: string): Promise<NetworkRequest | null> {
    if (!this.networkCaptureEnabled) {
      throw new Error(
        'Network capture not enabled. Call enableNetworkCapture() first.',
      );
    }

    return this.networkRequests.get(id) || null;
  }

  /**
   * Click an element matching the selector
   */
  async click(selector: string): Promise<void> {
    this.ensureInitialized();
    await this.page!.click(selector);
  }

  /**
   * Type text into an element matching the selector
   */
  async type(selector: string, text: string): Promise<void> {
    this.ensureInitialized();
    await this.page!.fill(selector, text);
  }

  /**
   * Scroll the page
   */
  async scroll(direction: 'up' | 'down', amount = 500): Promise<void> {
    this.ensureInitialized();
    const deltaY = direction === 'down' ? amount : -amount;
    await this.page!.evaluate((delta: number) => {
      window.scrollBy(0, delta);
    }, deltaY);
  }

  /**
   * Wait for an element matching the selector to appear
   */
  async waitForSelector(selector: string, timeout = 30000): Promise<void> {
    this.ensureInitialized();
    await this.page!.waitForSelector(selector, { timeout });
  }

  /**
   * Check if current session is persistent
   */
  isPersistentSession(): boolean {
    return !!this.options.persistent;
  }

  /**
   * Get information about the current session
   */
  getSessionInfo(): { type: 'isolated' | 'persistent'; path?: string } {
    if (this.options.persistent) {
      return {
        type: 'persistent',
        path:
          typeof this.options.persistent === 'string'
            ? this.options.persistent
            : undefined,
      };
    }
    return { type: 'isolated' };
  }

  /**
   * Perform an action using natural language instruction
   * Note: KernelBrowserClient does not support AI-based actions, use StagehandClient instead
   */
  async act(_instruction: string): Promise<void> {
    throw new Error(
      'KernelBrowserClient does not support AI-based act(). Use StagehandClient instead.',
    );
  }

  /**
   * Extract data from the page using natural language instruction and schema
   * Note: KernelBrowserClient does not support AI-based extraction, use StagehandClient instead
   */
  async extract<T>(_instruction: string, _schema: import('zod').ZodSchema<T>): Promise<T> {
    throw new Error(
      'KernelBrowserClient does not support AI-based extract(). Use StagehandClient instead.',
    );
  }

  /**
   * Get direct access to the underlying page
   */
  getPage(): Page {
    this.ensureInitialized();
    return this.page!;
  }

  /**
   * Ensure the client is initialized before operations
   */
  private ensureInitialized(): void {
    if (!this.page) {
      throw new Error(
        'KernelBrowserClient not initialized. Call init() first.',
      );
    }
  }

  /**
   * Check if a URL matches the capture patterns
   */
  private shouldCaptureRequest(url: string): boolean {
    if (this.capturePatterns.length === 0)
      return true;

    return this.capturePatterns.some((pattern) => {
      const regex = new RegExp(
        pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'),
      );
      return regex.test(url);
    });
  }
}
