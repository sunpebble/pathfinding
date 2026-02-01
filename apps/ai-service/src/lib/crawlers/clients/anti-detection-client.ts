import type { Page as StagehandPage } from '@browserbasehq/stagehand';
import type { ProxyCreateResponse } from '@onkernel/sdk/resources/proxies';
import type { Buffer } from 'node:buffer';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import type { Browser, BrowserContext, Page } from 'playwright';
import type { z, ZodSchema } from 'zod';
import type {
  BrowserClient,
  NetworkRequest,
  PageSnapshot,
  SessionOptions,
} from './types';
import { Stagehand } from '@browserbasehq/stagehand';
import Kernel from '@onkernel/sdk';
import OpenAI from 'openai';
import { chromium } from 'playwright';
import { createLogger } from '../../logger.js';

const log = createLogger('anti-detection-client');

/**
 * Kernel browser instance returned by the SDK
 */
interface KernelBrowserInstance {
  cdp_ws_url: string;
  session_id: string;
}

/**
 * Fingerprint configuration for browser randomization
 */
interface FingerprintConfig {
  userAgent: string;
  viewport: { width: number; height: number };
  timezone: string;
  locale: string;
}

/**
 * Common User-Agents for randomization
 */
const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

/**
 * Common viewport sizes for randomization
 */
const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1536, height: 864 },
  { width: 1366, height: 768 },
  { width: 1280, height: 720 },
];

/**
 * Common timezones for China region
 */
const TIMEZONES = [
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Asia/Taipei',
];

/**
 * Generate a random fingerprint configuration
 */
function generateFingerprint(): FingerprintConfig {
  return {
    userAgent: USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
    viewport: VIEWPORTS[Math.floor(Math.random() * VIEWPORTS.length)],
    timezone: TIMEZONES[Math.floor(Math.random() * TIMEZONES.length)],
    locale: 'zh-CN',
  };
}

/**
 * Stagehand LLM client options interface
 * Matches the format Stagehand uses internally
 */
interface StagehandLLMOptions {
  messages: Array<{
    role: string;
    content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
  }>;
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  image?: {
    buffer: Buffer;
    description?: string;
  };
  response_model?: {
    name: string;
    schema: Record<string, unknown>;
  };
  requestId?: string;
}

/**
 * Stagehand LLM client call params
 * Stagehand wraps options in an object with optional retries and logger
 */
interface StagehandCreateChatCompletionParams {
  options: StagehandLLMOptions;
  retries?: number;
  logger?: (log: { category: string; message: string; level: number; auxiliary?: Record<string, unknown> }) => void;
}

/**
 * Custom OpenAI-compatible LLM client for Stagehand
 * Implements the interface Stagehand expects for custom LLM clients
 */
class CustomOpenAIClient {
  private client: OpenAI;
  public modelName: string;

  constructor(options: { modelName: string; client: OpenAI }) {
    this.modelName = options.modelName;
    this.client = options.client;
  }

  /**
   * Create chat completion - matches Stagehand's expected interface
   * Stagehand calls this with { options, retries?, logger? }
   */
  async createChatCompletion(params: StagehandCreateChatCompletionParams) {
    const { options, logger } = params;

    // Log the request for debugging
    if (logger) {
      logger({
        category: 'custom-openai',
        message: `Creating chat completion with model: ${this.modelName}`,
        level: 1,
        auxiliary: {
          messageCount: { value: String(options.messages?.length || 0), type: 'string' },
        },
      });
    }

    // Flatten messages - Stagehand may send complex content arrays
    const formattedMessages = options.messages.map((msg) => {
      let content: string;
      if (Array.isArray(msg.content)) {
        // Extract text from content parts
        content = msg.content
          .filter((part): part is { type: string; text: string } => 'text' in part)
          .map(part => part.text)
          .join('\n');
      }
      else {
        content = msg.content;
      }
      return {
        role: msg.role as 'system' | 'user' | 'assistant',
        content,
      };
    });

    try {
      const response = await this.client.chat.completions.create({
        model: this.modelName,
        messages: formattedMessages as ChatCompletionMessageParam[],
        temperature: options.temperature ?? 0.1,
        top_p: options.top_p,
        frequency_penalty: options.frequency_penalty,
        presence_penalty: options.presence_penalty,
      });

      // Handle models that use function calling for structured output
      if (response.choices?.[0]) {
        const choice = response.choices[0];
        if (choice.message?.content === null && choice.message?.tool_calls?.length) {
          const toolCall = choice.message.tool_calls[0];
          if (toolCall.function?.arguments) {
            (choice.message as { content: string | null }).content = toolCall.function.arguments;
          }
        }
      }

      if (logger) {
        logger({
          category: 'custom-openai',
          message: 'Chat completion successful',
          level: 1,
          auxiliary: {
            model: { value: this.modelName, type: 'string' },
          },
        });
      }

      return response;
    }
    catch (error) {
      if (logger) {
        logger({
          category: 'custom-openai',
          message: `Chat completion failed: ${error}`,
          level: 0,
        });
      }
      throw error;
    }
  }
}

/**
 * Anti-Detection Browser Client
 *
 * Unified browser client with enhanced anti-detection capabilities:
 * - Kernel.sh stealth mode as primary backend
 * - Fingerprint randomization (User-Agent, viewport, timezone)
 * - Fallback to Stagehand LOCAL when Kernel unavailable
 * - AI capabilities (act/extract) through Stagehand integration
 *
 * Environment variables:
 * - KERNEL_API_KEY: API key for Kernel.sh (recommended)
 * - USE_LEGACY_CLIENT: Set to 'true' to bypass this client
 * - STAGEHAND_API_KEY: API key for Stagehand LLM
 * - STAGEHAND_BASE_URL: Custom LLM endpoint
 * - STAGEHAND_MODEL: LLM model name (default: gpt-4o)
 */
export class AntiDetectionBrowserClient implements BrowserClient {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private stagehandPage: StagehandPage | null = null;
  private options: SessionOptions = {};
  private networkRequests: Map<string, NetworkRequest> = new Map();
  private capturePatterns: string[] = [];
  private networkCaptureEnabled = false;
  private requestIdCounter = 0;
  private kernelBrowser: KernelBrowserInstance | null = null;
  private kernelProxy: ProxyCreateResponse | null = null;
  private stagehand: Stagehand | null = null;
  private fingerprint: FingerprintConfig | null = null;
  private useKernel = false;
  private useArc = false;
  private arcCdpPort = 9222;

  /**
   * Initialize the browser session
   * Priority: Arc browser (CDP) > Kernel.sh > Stagehand LOCAL
   */
  async init(options?: SessionOptions): Promise<void> {
    this.options = options || {};
    this.fingerprint = generateFingerprint();

    log.info({ fingerprint: this.fingerprint }, 'Generated browser fingerprint');

    // Try Arc browser first if enabled via env var
    if (process.env.USE_ARC_BROWSER === 'true') {
      try {
        await this.initWithArc();
        this.useArc = true;
        this.useKernel = false;
        return;
      }
      catch (error) {
        log.warn({ error }, 'Arc browser connection failed, trying other options');
      }
    }

    // Try Kernel.sh if API key is available
    if (process.env.KERNEL_API_KEY) {
      try {
        await this.initWithKernel();
        this.useKernel = true;
        return;
      }
      catch (error) {
        log.warn({ error }, 'Kernel.sh initialization failed, falling back to Stagehand');
      }
    }

    // Fallback to Stagehand LOCAL mode
    await this.initWithStagehand();
    this.useKernel = false;
  }

  /**
   * Initialize browser by connecting to Arc browser via CDP
   * Arc must be started with --remote-debugging-port=9222
   *
   * To start Arc with debugging:
   *   /Applications/Arc.app/Contents/MacOS/Arc --remote-debugging-port=9222
   */
  private async initWithArc(): Promise<void> {
    const port = Number.parseInt(process.env.ARC_CDP_PORT || '9222', 10);
    this.arcCdpPort = port;

    log.info({ port }, 'Connecting to Arc browser via CDP...');

    // Check if Arc is running with debugging enabled
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (!response.ok) {
        throw new Error(`Arc not responding on port ${port}`);
      }
      const info = await response.json();
      log.info({ browser: info.Browser }, 'Arc browser detected');
    }
    catch {
      throw new Error(
        `Cannot connect to Arc browser. Please start Arc with: `
        + `/Applications/Arc.app/Contents/MacOS/Arc --remote-debugging-port=${port}`,
      );
    }

    // Connect via CDP using rebrowser-playwright-core for better compatibility
    const { chromium: rebrowserChromium } = await import('rebrowser-playwright-core');
    // @ts-expect-error - rebrowser-playwright-core types differ slightly from playwright
    this.browser = await rebrowserChromium.connectOverCDP(`http://127.0.0.1:${port}`);

    // Get existing context (must use existing context to preserve cookies/session)
    const contexts = this.browser!.contexts();
    if (contexts.length === 0) {
      throw new Error('No browser context found. Please open a tab in Arc browser first.');
    }
    this.context = contexts[0];

    // Always create a new page for crawling to avoid conflicts with user's tabs
    // The new page inherits cookies from the context, so login state is preserved
    this.page = await this.context.newPage();
    log.info('Created new tab in Arc browser (inherits cookies from context)');

    log.info('Arc browser connected via CDP - ready for crawling');
  }

  /**
   * Initialize browser using Kernel.sh with stealth mode and residential proxy
   */
  private async initWithKernel(): Promise<void> {
    log.info('Creating cloud browser via Kernel.sh with stealth mode...');

    const kernel = new Kernel();

    // Create residential proxy for better anti-detection
    // Kernel.sh proxies are free (included in browser usage)
    // Set KERNEL_USE_RESIDENTIAL_PROXY=true to enable (requires Start-Up plan)
    const useResidentialProxy = process.env.KERNEL_USE_RESIDENTIAL_PROXY === 'true';

    if (useResidentialProxy) {
      try {
        // Create a residential proxy targeting China for Chinese websites
        this.kernelProxy = await kernel.proxies.create({
          type: 'residential',
          name: `crawler-proxy-${Date.now()}`,
          config: {
            country: process.env.KERNEL_PROXY_COUNTRY || 'CN',
          },
        });
        log.info({
          proxyId: this.kernelProxy.id,
          proxyType: this.kernelProxy.type,
          ipAddress: this.kernelProxy.ip_address,
        }, 'Residential proxy created');
      }
      catch (error) {
        log.warn({ error }, 'Failed to create residential proxy, proceeding without proxy');
      }
    }

    // Create browser with proxy if available
    this.kernelBrowser = await kernel.browsers.create({
      stealth: true,
      headless: this.options.headless !== false,
      ...(this.kernelProxy?.id && { proxy_id: this.kernelProxy.id }),
    });

    const cdpWsUrl = this.kernelBrowser.cdp_ws_url;
    log.info({
      sessionId: this.kernelBrowser.session_id,
      hasProxy: !!this.kernelProxy?.id,
    }, 'Kernel browser created');

    // Connect via CDP
    this.browser = await chromium.connectOverCDP(cdpWsUrl);

    // Get or create context with fingerprint
    const contexts = this.browser.contexts();
    this.context = contexts.length > 0
      ? contexts[0]
      : await this.browser.newContext({
          viewport: this.options.viewport || this.fingerprint!.viewport,
          userAgent: this.fingerprint!.userAgent,
          locale: this.fingerprint!.locale,
          timezoneId: this.fingerprint!.timezone,
        });

    // Get or create page
    const pages = this.context.pages();
    this.page = pages.length > 0 ? pages[0] : await this.context.newPage();

    // Initialize Stagehand for AI capabilities
    await this.initStagehandForAI();

    log.info('Kernel browser ready with stealth mode');
  }

  /**
   * Initialize browser using Stagehand LOCAL mode
   */
  private async initWithStagehand(): Promise<void> {
    log.info('Creating browser via Stagehand LOCAL mode...');

    const env = process.env.STAGEHAND_ENV === 'BROWSERBASE' ? 'BROWSERBASE' : 'LOCAL';

    if (!process.env.STAGEHAND_API_KEY) {
      throw new Error('STAGEHAND_API_KEY environment variable is required');
    }

    const openaiClient = new OpenAI({
      apiKey: process.env.STAGEHAND_API_KEY,
      baseURL: process.env.STAGEHAND_BASE_URL || 'https://n.kunish.org/v1',
    });

    const llmClient = new CustomOpenAIClient({
      modelName: process.env.STAGEHAND_MODEL || 'claude-opus-4-5-20251101',
      client: openaiClient,
    });

    this.stagehand = new Stagehand({
      env,
      llmClient: llmClient as unknown as ConstructorParameters<typeof Stagehand>[0]['llmClient'],
      ...(env === 'LOCAL' && {
        localBrowserLaunchOptions: {
          headless: this.options.headless !== false,
          ...(this.options.viewport && { viewport: this.options.viewport }),
        },
      }),
    });

    await this.stagehand.init();
    this.stagehandPage = this.stagehand.context.activePage() || null;

    log.info('Stagehand browser ready (LOCAL mode)');
  }

  /**
   * Initialize Stagehand for AI capabilities when using Kernel browser
   * Since we use extractWithDirectLLM for AI extraction, we only need
   * Stagehand for basic page operations, not LLM calls.
   */
  private async initStagehandForAI(): Promise<void> {
    if (!this.kernelBrowser?.cdp_ws_url) {
      log.warn('Kernel browser CDP URL not available');
      return;
    }

    // Skip Stagehand AI initialization when using Kernel.sh
    // We use extractWithDirectLLM() for AI extraction instead,
    // which calls the LLM API directly without Stagehand's involvement.
    // This avoids compatibility issues with custom OpenAI-compatible APIs.
    log.info('Kernel browser ready - using direct LLM extraction (bypassing Stagehand AI)');
  }

  /**
   * Close the browser session and clean up resources
   */
  async close(): Promise<void> {
    if (this.stagehand && !this.useKernel && !this.useArc) {
      await this.stagehand.close();
      this.stagehand = null;
    }

    if (this.browser) {
      if (this.useArc) {
        // For Arc, just close the page we created, don't close the browser
        if (this.page) {
          await this.page.close();
          this.page = null;
        }
        // Disconnect from browser without closing it
        if ((this.browser as unknown as { disconnect?: () => void }).disconnect) {
          (this.browser as unknown as { disconnect: () => void }).disconnect();
        }
        log.info('Disconnected from Arc browser (browser still running)');
      }
      else {
        await this.browser.close();
      }
      this.browser = null;
      this.context = null;
      this.page = null;
    }

    if (this.kernelBrowser) {
      log.info({ sessionId: this.kernelBrowser.session_id }, 'Kernel browser disconnected');
      this.kernelBrowser = null;
    }

    // Clean up proxy (optional, Kernel handles cleanup automatically)
    if (this.kernelProxy) {
      log.info({ proxyId: this.kernelProxy.id }, 'Kernel proxy session ended');
      this.kernelProxy = null;
    }

    this.stagehandPage = null;
    this.networkRequests.clear();
    this.capturePatterns = [];
    this.networkCaptureEnabled = false;
  }

  /**
   * Recreate the browser instance (for retry strategy)
   */
  async recreate(): Promise<void> {
    log.info('Recreating browser instance...');
    await this.close();
    await this.init(this.options);
  }

  /**
   * Clear cookies and session data (for session-level retry)
   */
  async clearSession(): Promise<void> {
    if (this.context) {
      await this.context.clearCookies();
      log.info('Session cookies cleared');
    }
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

    if ((this.useKernel || this.useArc) && this.page) {
      await this.page.goto(url, {
        timeout: options?.timeout || 60000,
        waitUntil: options?.waitUntil || 'domcontentloaded',
      });
    }
    else if (this.stagehandPage) {
      await this.stagehandPage.goto(url, {
        timeoutMs: options?.timeout,
        waitUntil: options?.waitUntil || 'networkidle',
      });
    }
  }

  /**
   * Take a snapshot of the current page
   */
  async takeSnapshot(options?: { verbose?: boolean }): Promise<PageSnapshot> {
    this.ensureInitialized();

    let content: string;
    let url: string;

    if ((this.useKernel || this.useArc) && this.page) {
      content = await this.page.content();
      url = this.page.url();
    }
    else if (this.stagehandPage) {
      const snapshot = await this.stagehandPage.snapshot();
      content = snapshot.formattedTree;
      url = this.stagehandPage.url();
    }
    else {
      throw new Error('No page available');
    }

    if (options?.verbose) {
      log.info({ url, contentLength: content.length }, 'Snapshot taken');
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

    if ((this.useKernel || this.useArc) && this.page) {
      return await this.page.content();
    }
    else if (this.stagehandPage) {
      const snapshot = await this.stagehandPage.snapshot();
      return snapshot.formattedTree;
    }

    throw new Error('No page available');
  }

  /**
   * Enable network request capture with optional URL patterns
   */
  async enableNetworkCapture(patterns?: string[]): Promise<void> {
    this.ensureInitialized();

    this.capturePatterns = patterns || ['**/*'];
    this.networkCaptureEnabled = true;

    if ((this.useKernel || this.useArc) && this.page) {
      this.page.on('request', (request) => {
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

      this.page.on('response', async (response) => {
        const request = response.request();
        if (this.shouldCaptureRequest(request.url())) {
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
    else {
      log.warn('Network capture not fully supported with Stagehand V3');
    }
  }

  /**
   * List captured network requests
   */
  async listNetworkRequests(types?: string[]): Promise<NetworkRequest[]> {
    if (!this.networkCaptureEnabled) {
      throw new Error('Network capture not enabled. Call enableNetworkCapture() first.');
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
      throw new Error('Network capture not enabled. Call enableNetworkCapture() first.');
    }

    return this.networkRequests.get(id) || null;
  }

  /**
   * Click an element matching the selector
   */
  async click(selector: string): Promise<void> {
    this.ensureInitialized();

    if ((this.useKernel || this.useArc) && this.page) {
      await this.page.click(selector);
    }
    else if (this.stagehandPage) {
      await this.stagehandPage.locator(selector).click();
    }
  }

  /**
   * Type text into an element
   */
  async type(selector: string, text: string): Promise<void> {
    this.ensureInitialized();

    if ((this.useKernel || this.useArc) && this.page) {
      await this.page.fill(selector, text);
    }
    else if (this.stagehandPage) {
      await this.stagehandPage.locator(selector).fill(text);
    }
  }

  /**
   * Scroll the page
   */
  async scroll(direction: 'up' | 'down', amount = 500): Promise<void> {
    this.ensureInitialized();
    const deltaY = direction === 'down' ? amount : -amount;

    if ((this.useKernel || this.useArc) && this.page) {
      await this.page.evaluate((delta: number) => {
        window.scrollBy(0, delta);
      }, deltaY);
    }
    else if (this.stagehandPage) {
      await this.stagehandPage.evaluate((delta: number) => {
        window.scrollBy(0, delta);
      }, deltaY);
    }
  }

  /**
   * Wait for an element to appear
   */
  async waitForSelector(selector: string, timeout = 30000): Promise<void> {
    this.ensureInitialized();

    if ((this.useKernel || this.useArc) && this.page) {
      await this.page.waitForSelector(selector, { timeout });
    }
    else if (this.stagehandPage) {
      // Stagehand V3 locator doesn't have waitFor
      this.stagehandPage.locator(selector);
    }
  }

  /**
   * Perform an action using natural language instruction (AI-powered)
   */
  async act(instruction: string): Promise<void> {
    this.ensureInitialized();

    if (!this.stagehand) {
      throw new Error('Stagehand not initialized for AI operations');
    }

    await this.stagehand.act(instruction);
  }

  /**
   * Extract data using natural language instruction and schema (AI-powered)
   */
  async extract<T>(instruction: string, schema: z.ZodSchema<T>): Promise<T> {
    this.ensureInitialized();

    if (!this.stagehand) {
      throw new Error('Stagehand not initialized for AI operations');
    }

    const result = await this.stagehand.extract(
      instruction,
      schema as unknown as ZodSchema,
    );

    return result as T;
  }

  /**
   * Extract structured data directly using LLM API (bypasses Stagehand)
   * This method gets page content and calls the LLM API directly,
   * avoiding Stagehand's internal LLM handling which may be incompatible
   * with some OpenAI-compatible APIs.
   */
  async extractWithDirectLLM<T>(
    instruction: string,
    schema: z.ZodSchema<T>,
  ): Promise<T> {
    this.ensureInitialized();

    // Get page content
    const pageContent = await this.getPageContent();
    const url = this.useKernel && this.page ? this.page.url() : this.stagehandPage?.url() || '';

    // Build the prompt with JSON schema
    const schemaDescription = JSON.stringify(schema._def, null, 2);

    const systemPrompt = `你是一个专业的网页数据提取助手。你的任务是从网页内容中提取结构化数据。

请严格按照以下 JSON 格式返回数据，不要添加任何额外的文字说明或 markdown 代码块：

期望的数据结构：
${schemaDescription}

重要规则：
1. 只返回 JSON 数据，不要有任何其他内容
2. 确保 JSON 格式正确，可以被直接解析
3. 如果某个字段在页面中找不到，使用 null 或空数组
4. URL 必须是完整的绝对路径`;

    const userPrompt = `请从以下网页内容中提取数据。

页面 URL: ${url}

用户指令: ${instruction}

网页内容:
${pageContent.substring(0, 50000)}`;

    // Call LLM API directly
    const openaiClient = new OpenAI({
      apiKey: process.env.STAGEHAND_API_KEY || process.env.OPENAI_API_KEY,
      baseURL: process.env.STAGEHAND_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    });

    const modelName = process.env.STAGEHAND_MODEL || process.env.OPENAI_MODEL || 'gpt-4o';

    log.info({ modelName, contentLength: pageContent.length }, 'Calling LLM for direct extraction');

    const response = await openaiClient.chat.completions.create({
      model: modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error('LLM returned empty response');
    }

    log.info({ responseLength: content.length }, 'LLM extraction completed');

    // Parse JSON from response (handle markdown code blocks)
    let jsonStr = content.trim();

    // Remove markdown code blocks if present
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7);
    }
    else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3);
    }
    jsonStr = jsonStr.trim();

    try {
      const parsed = JSON.parse(jsonStr);

      // Validate against schema
      const validated = schema.parse(parsed);
      return validated;
    }
    catch (parseError) {
      log.error({ error: parseError, content: jsonStr.substring(0, 500) }, 'Failed to parse LLM response as JSON');
      throw new Error(`Failed to parse LLM response: ${parseError}`);
    }
  }

  /**
   * Check if current session is persistent
   */
  isPersistentSession(): boolean {
    return !!this.options.persistent;
  }

  /**
   * Get session information
   */
  getSessionInfo(): { type: 'isolated' | 'persistent'; path?: string } {
    if (this.options.persistent) {
      return {
        type: 'persistent',
        path: typeof this.options.persistent === 'string' ? this.options.persistent : undefined,
      };
    }
    return { type: 'isolated' };
  }

  /**
   * Get direct access to the underlying page
   */
  getPage(): Page | StagehandPage {
    this.ensureInitialized();
    if ((this.useKernel || this.useArc) && this.page) {
      return this.page;
    }
    // In Stagehand mode, return the stagehand page
    if (this.stagehandPage) {
      return this.stagehandPage;
    }
    throw new Error('No page available');
  }

  /**
   * Check if using Kernel backend
   */
  isUsingKernel(): boolean {
    return this.useKernel;
  }

  /**
   * Check if using Arc browser
   */
  isUsingArc(): boolean {
    return this.useArc;
  }

  /**
   * Get current fingerprint configuration
   */
  getFingerprint(): FingerprintConfig | null {
    return this.fingerprint;
  }

  /**
   * Ensure the client is initialized
   */
  private ensureInitialized(): void {
    if (!this.page && !this.stagehandPage) {
      throw new Error('AntiDetectionBrowserClient not initialized. Call init() first.');
    }
  }

  /**
   * Check if a URL matches capture patterns
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
