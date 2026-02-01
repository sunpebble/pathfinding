/**
 * Block detection types and interfaces
 */

/**
 * Types of blocks that can be detected
 */
export type BlockType
  = | 'none'
    | 'captcha'
    | 'rate-limit'
    | 'ip-ban'
    | 'session-expired';

/**
 * Block detection result
 */
export interface BlockDetectionResult {
  type: BlockType;
  confidence: number;
  message?: string;
}

/**
 * Platform-specific block detector function
 */
export type BlockDetector = (
  content: string,
  statusCode?: number,
) => BlockDetectionResult;

/**
 * Retry layer types
 */
export type RetryLayer = 'request' | 'session' | 'browser';

/**
 * Retry attempt record
 */
export interface RetryAttempt {
  layer: RetryLayer;
  attempt: number;
  blockType: BlockType;
  timestamp: number;
  success: boolean;
  duration?: number;
}

/**
 * Retry metrics for logging
 */
export interface RetryMetrics {
  platform: string;
  totalAttempts: number;
  layers: {
    request: number;
    session: number;
    browser: number;
  };
  blockTypes: Record<BlockType, number>;
  finalStatus: 'success' | 'failed';
  totalDuration: number;
}

/**
 * Retry strategy configuration
 */
export interface RetryConfig {
  /** Maximum request-level retries */
  maxRequestRetries: number;
  /** Maximum session-level retries */
  maxSessionRetries: number;
  /** Maximum browser-level retries */
  maxBrowserRetries: number;
  /** Base delay for exponential backoff (ms) */
  baseDelay: number;
  /** Maximum delay between retries (ms) */
  maxDelay: number;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRequestRetries: 3,
  maxSessionRetries: 2,
  maxBrowserRetries: 1,
  baseDelay: 1000,
  maxDelay: 16000,
};
