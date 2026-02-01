import type { BrowserClient } from './types';
import { AntiDetectionBrowserClient } from './anti-detection-client';
import { KernelBrowserClient } from './kernel-client';
import { StagehandBrowserClient } from './stagehand-client';

export { AntiDetectionBrowserClient } from './anti-detection-client';
export { KernelBrowserClient } from './kernel-client';

export { StagehandBrowserClient } from './stagehand-client';
export type {
  BrowserClient,
  NetworkRequest,
  PageSnapshot,
  SessionOptions,
} from './types';

/**
 * Creates the recommended anti-detection browser client
 *
 * This client provides:
 * - Kernel.sh stealth mode (if KERNEL_API_KEY is set)
 * - Fingerprint randomization (User-Agent, viewport, timezone)
 * - Fallback to Stagehand LOCAL mode
 * - AI capabilities (act/extract) through Stagehand
 *
 * Environment variables:
 * - KERNEL_API_KEY: API key for Kernel.sh (recommended)
 * - USE_LEGACY_CLIENT: Set to 'true' to use legacy client
 * - STAGEHAND_API_KEY: API key for Stagehand LLM
 * - STAGEHAND_BASE_URL: Custom LLM endpoint
 * - STAGEHAND_MODEL: LLM model name (default: gpt-4o)
 */
export function createAntiDetectionClient(): BrowserClient {
  return new AntiDetectionBrowserClient();
}

/**
 * Creates a browser client based on environment configuration
 *
 * Priority:
 * 1. USE_LEGACY_CLIENT=true → Use legacy client selection
 * 2. Otherwise → Use AntiDetectionBrowserClient (recommended)
 *
 * Legacy priority (when USE_LEGACY_CLIENT=true):
 * 1. KERNEL_API_KEY set → Use Kernel (recommended for anti-bot)
 * 2. Otherwise → Use Stagehand with Browserbase/Local
 *
 * Kernel environment variables:
 * - KERNEL_API_KEY: API key for Kernel.sh
 * - KERNEL_API_URL: API endpoint (default: https://api.onkernel.com)
 *
 * Stagehand environment variables:
 * - STAGEHAND_BASE_URL: Custom API endpoint
 * - STAGEHAND_API_KEY: API key for the custom endpoint
 * - STAGEHAND_MODEL: Model name to use (default: gpt-4o)
 * - STAGEHAND_ENV: 'LOCAL' or 'BROWSERBASE'
 */
export function createBrowserClient(): BrowserClient {
  // Use legacy client if explicitly requested
  if (process.env.USE_LEGACY_CLIENT === 'true') {
    // Prefer Kernel if API key is set
    if (process.env.KERNEL_API_KEY) {
      return new KernelBrowserClient();
    }
    // Fallback to Stagehand
    return new StagehandBrowserClient();
  }

  // Default: use the new anti-detection client
  return new AntiDetectionBrowserClient();
}
