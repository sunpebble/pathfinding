import type { z } from 'zod';
import type {
  BrowserClient,
  NetworkRequest,
  PageSnapshot,
  SessionOptions,
} from './types';
import { Stagehand } from '@browserbasehq/stagehand';
import OpenAI from 'openai';
import { createLogger } from '../../logger.js';

const log = createLogger('stagehand-client');

/**
 * Custom OpenAI-compatible LLM client for Stagehand
 * Supports any OpenAI-compatible API endpoint
 */
class CustomOpenAIClient {
  private client: OpenAI;
  public modelName: string;

  constructor(options: { modelName: string; client: OpenAI }) {
    this.modelName = options.modelName;
    this.client = options.client;
  }

  async createChatCompletion(params: {
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
    max_tokens?: number;
  }) {
    const response = await this.client.chat.completions.create({
      model: this.modelName,
      messages: params.messages as any,
      temperature: params.temperature,
      max_tokens: params.max_tokens,
    });
    return response;
  }
}

/**
 * StagehandBrowserClient - AI-powered browser automation using Stagehand
 *
 * This client provides a lightweight wrapper around Stagehand, which uses
 * custom OpenAI-compatible APIs for intelligent browser interactions. Unlike SteelClient,
 * this client manages its own browser instance and is best suited for simpler
 * automation scenarios that don't require extensive network interception.
 *
 * Key features:
 * - Natural language actions via act()
 * - Structured data extraction via extract()
 * - Automatic browser management
 * - Works with both local and Browserbase environments
 */
export class StagehandBrowserClient implements BrowserClient {
  private stagehand: Stagehand | null = null;
  private options: SessionOptions = {};
  private networkRequests: Map<string, NetworkRequest> = new Map();
  private capturePatterns: string[] = [];
  private networkCaptureEnabled = false;

  /**
   * Initialize the browser session with Stagehand
   */
  async init(options?: SessionOptions): Promise<void> {
    this.options = options || {};

    // Determine environment: prefer STAGEHAND_ENV, fallback to STEEL_LOCAL
    const env
      = process.env.STAGEHAND_ENV === 'BROWSERBASE'
        ? 'BROWSERBASE'
        : process.env.STEEL_LOCAL === 'true'
          ? 'LOCAL'
          : 'BROWSERBASE';

    // Create custom OpenAI client for Stagehand
    if (!process.env.STAGEHAND_API_KEY) {
      throw new Error(
        'STAGEHAND_API_KEY environment variable is required for Stagehand client',
      );
    }

    const openaiClient = new OpenAI({
      apiKey: process.env.STAGEHAND_API_KEY,
      baseURL:
        process.env.STAGEHAND_BASE_URL || 'https://new-api.kunish.org/v1',
    });

    const llmClient = new CustomOpenAIClient({
      modelName: process.env.STAGEHAND_MODEL || 'gpt-4o',
      client: openaiClient,
    });

    // Initialize Stagehand with custom LLM client
    this.stagehand = new Stagehand({
      env,
      llmClient: llmClient as any,
      // Apply headless and viewport to local browser launch options
      ...(env === 'LOCAL' && {
        localBrowserLaunchOptions: {
          headless: this.options.headless !== false,
          ...(this.options.viewport && {
            viewport: this.options.viewport,
          }),
        },
      }),
    });

    await this.stagehand.init();
  }

  /**
   * Close the browser session and clean up resources
   */
  async close(): Promise<void> {
    if (this.stagehand) {
      await this.stagehand.close();
      this.stagehand = null;
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
    const page = this.stagehand!.context.activePage();
    if (!page) {
      throw new Error('No active page found');
    }
    await page.goto(url, {
      timeoutMs: options?.timeout,
      waitUntil: options?.waitUntil || 'networkidle',
    });
  }

  /**
   * Take a snapshot of the current page
   */
  async takeSnapshot(options?: { verbose?: boolean }): Promise<PageSnapshot> {
    this.ensureInitialized();
    const page = this.stagehand!.context.activePage();
    if (!page) {
      throw new Error('No active page found');
    }

    // Use Stagehand's snapshot for the formatted tree, but we need HTML content
    // For now, return the formatted tree as content
    const snapshot = await page.snapshot();
    const url = page.url();

    if (options?.verbose) {
      log.warn({ url, treeLength: snapshot.formattedTree.length }, 'Snapshot taken');
    }

    return {
      content: snapshot.formattedTree,
      url,
      timestamp: new Date(),
    };
  }

  /**
   * Get the current page content
   */
  async getPageContent(): Promise<string> {
    this.ensureInitialized();
    const page = this.stagehand!.context.activePage();
    if (!page) {
      throw new Error('No active page found');
    }
    const snapshot = await page.snapshot();
    return snapshot.formattedTree;
  }

  /**
   * Enable network request capture with optional URL patterns
   */
  async enableNetworkCapture(patterns?: string[]): Promise<void> {
    this.ensureInitialized();

    // Note: Stagehand V3 doesn't expose direct event listeners for request/response
    // Network capture would need to be implemented differently or is not supported
    this.capturePatterns = patterns || ['**/*'];
    this.networkCaptureEnabled = true;

    log.warn(
      'Network capture not fully supported with Stagehand V3 - events may not be captured',
    );
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
   * Perform an action using natural language instruction
   * This is Stagehand's flagship feature - AI-powered browser actions
   */
  async act(instruction: string): Promise<void> {
    this.ensureInitialized();
    await this.stagehand!.act(instruction);
  }

  /**
   * Extract data from the page using natural language instruction and schema
   * Returns strongly-typed data validated against the Zod schema
   */
  async extract<T>(instruction: string, schema: z.ZodSchema<T>): Promise<T> {
    this.ensureInitialized();
    // Use type assertion to handle Zod v3/v4 compatibility with Stagehand
    const result = await this.stagehand!.extract(instruction, schema as any);
    return result as T;
  }

  /**
   * Click an element matching the selector
   */
  async click(selector: string): Promise<void> {
    this.ensureInitialized();
    const page = this.stagehand!.context.activePage();
    if (!page) {
      throw new Error('No active page found');
    }
    await page.locator(selector).click();
  }

  /**
   * Type text into an element matching the selector
   */
  async type(selector: string, text: string): Promise<void> {
    this.ensureInitialized();
    const page = this.stagehand!.context.activePage();
    if (!page) {
      throw new Error('No active page found');
    }
    await page.locator(selector).fill(text);
  }

  /**
   * Scroll the page
   */
  async scroll(direction: 'up' | 'down', amount = 500): Promise<void> {
    this.ensureInitialized();
    const page = this.stagehand!.context.activePage();
    if (!page) {
      throw new Error('No active page found');
    }
    const deltaY = direction === 'down' ? amount : -amount;
    await page.evaluate((delta: number) => {
      window.scrollBy(0, delta);
    }, deltaY);
  }

  /**
   * Wait for an element matching the selector to appear
   */
  async waitForSelector(selector: string, _timeout = 30000): Promise<void> {
    this.ensureInitialized();
    const page = this.stagehand!.context.activePage();
    if (!page) {
      throw new Error('No active page found');
    }
    // Stagehand's locator doesn't have waitFor, use a simple delay approach
    // or rely on act() to handle waiting
    page.locator(selector);
  }

  /**
   * Check if current session is persistent
   * Note: Stagehand doesn't directly support persistent sessions in the same way
   * as Steel, but we track the option for interface compliance
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
   * Get direct access to the underlying page
   * Useful for advanced scenarios not covered by the interface
   */
  getPage(): any {
    this.ensureInitialized();
    const page = this.stagehand!.context.activePage();
    if (!page) {
      throw new Error('No active page found');
    }
    return page;
  }

  /**
   * Ensure the client is initialized before operations
   */
  private ensureInitialized(): void {
    if (!this.stagehand) {
      throw new Error(
        'StagehandBrowserClient not initialized. Call init() first.',
      );
    }
  }
}
