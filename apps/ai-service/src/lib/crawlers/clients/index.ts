import type { BrowserClient } from './types';
import { KernelBrowserClient } from './kernel-client';
import { StagehandBrowserClient } from './stagehand-client';

export { KernelBrowserClient } from './kernel-client';

export { StagehandBrowserClient } from './stagehand-client';
export type {
  BrowserClient,
  NetworkRequest,
  PageSnapshot,
  SessionOptions,
} from './types';

/**
 * Creates a browser client based on environment configuration
 *
 * Priority:
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
  // Prefer Kernel if API key is set
  if (process.env.KERNEL_API_KEY) {
    return new KernelBrowserClient();
  }

  // Fallback to Stagehand
  return new StagehandBrowserClient();
}
