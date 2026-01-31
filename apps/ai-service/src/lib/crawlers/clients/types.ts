import type { z } from 'zod';

/**
 * Represents a captured network request
 */
export interface NetworkRequest {
  /** Unique identifier for this request */
  id: string;
  /** Request URL */
  url: string;
  /** HTTP method (GET, POST, etc.) */
  method: string;
  /** HTTP status code (200, 404, etc.) */
  status: number;
  /** Resource type (document, xhr, fetch, etc.) */
  resourceType: string;
  /** Request headers */
  requestHeaders: Record<string, string>;
  /** Response headers */
  responseHeaders: Record<string, string>;
  /** Response body (may be null for non-text resources) */
  responseBody: string | null;
}

/**
 * Represents a snapshot of the page at a point in time
 */
export interface PageSnapshot {
  /** Page content (HTML or text) */
  content: string;
  /** Current page URL */
  url: string;
  /** Timestamp when snapshot was taken */
  timestamp: Date;
}

/**
 * Options for browser session initialization
 */
export interface SessionOptions {
  /**
   * Whether to use persistent session and optional path
   * - true: use default persistent session
   * - string: use persistent session at specified path
   * - false/undefined: use isolated session
   */
  persistent?: boolean | string;
  /** Whether to run browser in headless mode */
  headless?: boolean;
  /** Viewport configuration */
  viewport?: {
    width: number;
    height: number;
  };
  /** Optional session ID for resuming Steel sessions */
  sessionId?: string;
}

/**
 * Core browser client interface
 * Provides unified abstraction over different browser automation tools
 */
export interface BrowserClient {
  /**
   * Initialize the browser session
   */
  init: (options?: SessionOptions) => Promise<void>;

  /**
   * Close the browser session and clean up resources
   */
  close: () => Promise<void>;

  /**
   * Navigate to a URL
   */
  navigateTo: (
    url: string,
    options?: {
      timeout?: number;
      waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
    },
  ) => Promise<void>;

  /**
   * Take a snapshot of the current page
   */
  takeSnapshot: (options?: { verbose?: boolean }) => Promise<PageSnapshot>;

  /**
   * Get the current page content
   */
  getPageContent: () => Promise<string>;

  /**
   * Enable network request capture with optional URL patterns
   */
  enableNetworkCapture: (patterns?: string[]) => Promise<void>;

  /**
   * List captured network requests, optionally filtered by resource types
   */
  listNetworkRequests: (types?: string[]) => Promise<NetworkRequest[]>;

  /**
   * Get a specific network request by ID
   */
  getNetworkRequest: (id: string) => Promise<NetworkRequest | null>;

  /**
   * Perform an action using natural language instruction
   */
  act: (instruction: string) => Promise<void>;

  /**
   * Extract data from the page using natural language instruction and schema
   */
  extract: <T>(instruction: string, schema: z.ZodSchema<T>) => Promise<T>;

  /**
   * Click an element matching the selector
   */
  click: (selector: string) => Promise<void>;

  /**
   * Type text into an element matching the selector
   */
  type: (selector: string, text: string) => Promise<void>;

  /**
   * Scroll the page
   */
  scroll: (direction: 'up' | 'down', amount?: number) => Promise<void>;

  /**
   * Wait for an element matching the selector to appear
   */
  waitForSelector: (selector: string, timeout?: number) => Promise<void>;

  /**
   * Check if current session is persistent
   */
  isPersistentSession: () => boolean;

  /**
   * Get information about the current session
   */
  getSessionInfo: () => {
    type: 'isolated' | 'persistent';
    path?: string;
  };
}
