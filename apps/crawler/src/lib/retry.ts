/**
 * Retry Utilities
 * Provides unified retry logic with exponential backoff and circuit breaker pattern
 */

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial delay in ms (default: 1000) */
  initialDelay?: number;
  /** Maximum delay in ms (default: 30000) */
  maxDelay?: number;
  /** Backoff multiplier (default: 2) */
  backoffMultiplier?: number;
  /** Timeout in ms for each attempt (default: undefined - no timeout) */
  timeout?: number;
  /** Function to determine if error is retryable (default: all errors) */
  isRetryable?: (error: Error) => boolean;
  /** Callback on retry attempt */
  onRetry?: (error: Error, attempt: number) => void;
}

const DEFAULT_OPTIONS: Required<
  Omit<RetryOptions, 'timeout' | 'onRetry' | 'isRetryable'>
> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
};

/**
 * Execute a function with retry logic and exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;
  let delay = opts.initialDelay;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      // Apply timeout if specified
      if (opts.timeout) {
        return await Promise.race([
          fn(),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error(`Timeout after ${opts.timeout}ms`)),
              opts.timeout
            )
          ),
        ]);
      }
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Check if error is retryable
      if (opts.isRetryable && !opts.isRetryable(lastError)) {
        throw lastError;
      }

      // If this was the last attempt, throw
      if (attempt >= opts.maxRetries) {
        break;
      }

      // Call onRetry callback
      opts.onRetry?.(lastError, attempt + 1);

      // Wait with exponential backoff
      await sleep(delay);
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelay);
    }
  }

  throw lastError;
}

/**
 * Circuit Breaker implementation
 * Prevents repeated calls to a failing service
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private readonly threshold: number = 5,
    private readonly resetTimeout: number = 60000
  ) {}

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      // Check if reset timeout has passed
      if (Date.now() - this.lastFailureTime >= this.resetTimeout) {
        this.state = 'half-open';
      } else {
        throw new CircuitBreakerOpenError('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = 'open';
    }
  }

  get isOpen(): boolean {
    return this.state === 'open';
  }

  get failureCount(): number {
    return this.failures;
  }

  reset(): void {
    this.failures = 0;
    this.state = 'closed';
    this.lastFailureTime = 0;
  }
}

export class CircuitBreakerOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}

/**
 * Enhanced JSON parsing with multiple fallback strategies
 */
export function parseJsonSafely<T>(
  response: string,
  defaultValue: T
): { data: T; success: boolean; error?: string } {
  // Strategy 1: Try parsing the whole response
  try {
    return { data: JSON.parse(response) as T, success: true };
  } catch {
    // Continue to next strategy
  }

  // Strategy 2: Extract JSON object using greedy regex
  try {
    const objectMatch = response.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      return { data: JSON.parse(objectMatch[0]) as T, success: true };
    }
  } catch {
    // Continue to next strategy
  }

  // Strategy 3: Extract JSON array using greedy regex
  try {
    const arrayMatch = response.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      return { data: JSON.parse(arrayMatch[0]) as T, success: true };
    }
  } catch {
    // Continue to next strategy
  }

  // Strategy 4: Try to find balanced braces (handles nested objects better)
  try {
    const balancedJson = extractBalancedJson(response);
    if (balancedJson) {
      return { data: JSON.parse(balancedJson) as T, success: true };
    }
  } catch {
    // Continue to next strategy
  }

  // Strategy 5: Remove markdown code blocks and try again
  try {
    const cleanedResponse = response
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    const objectMatch = cleanedResponse.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      return { data: JSON.parse(objectMatch[0]) as T, success: true };
    }
  } catch {
    // All strategies failed
  }

  return {
    data: defaultValue,
    success: false,
    error: 'Failed to parse JSON from response',
  };
}

/**
 * Extract balanced JSON by counting braces
 */
function extractBalancedJson(text: string): string | null {
  const startIndex = text.indexOf('{');
  if (startIndex === -1) return null;

  let depth = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = startIndex; i < text.length; i++) {
    const char = text[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === '{') depth++;
      if (char === '}') {
        depth--;
        if (depth === 0) {
          return text.slice(startIndex, i + 1);
        }
      }
    }
  }

  return null;
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Rate limiter using token bucket algorithm
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private readonly maxTokens: number = 10,
    private readonly refillRate: number = 1, // tokens per second
    private readonly refillInterval: number = 1000
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  /**
   * Acquire a token, waiting if necessary
   */
  async acquire(): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens--;
      return;
    }

    // Wait for next refill
    const waitTime = this.refillInterval / this.refillRate;
    await sleep(waitTime);
    return this.acquire();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = (elapsed / this.refillInterval) * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  get availableTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }
}

/**
 * Execute tasks with controlled concurrency
 * Useful for batch processing with rate limits or resource constraints
 */
export async function withConcurrency<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  options: {
    concurrency?: number;
    onProgress?: (completed: number, total: number, item: T) => void;
    onError?: (error: Error, item: T, index: number) => void;
    stopOnError?: boolean;
  } = {}
): Promise<Array<{ item: T; result?: R; error?: Error }>> {
  const { concurrency = 3, onProgress, onError, stopOnError = false } = options;
  const results: Array<{ item: T; result?: R; error?: Error }> = [];
  let completed = 0;
  let shouldStop = false;

  // Process items in batches
  for (let i = 0; i < items.length; i += concurrency) {
    if (shouldStop) break;

    const batch = items.slice(i, i + concurrency);
    const batchPromises = batch.map(async (item, batchIndex) => {
      const index = i + batchIndex;
      try {
        const result = await fn(item, index);
        completed++;
        onProgress?.(completed, items.length, item);
        return { item, result };
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        onError?.(error, item, index);
        if (stopOnError) {
          shouldStop = true;
        }
        completed++;
        onProgress?.(completed, items.length, item);
        return { item, error };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return results;
}
