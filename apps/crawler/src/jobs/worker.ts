/* eslint-disable ts/ban-ts-comment */
// @ts-nocheck
/**
 * Crawl Worker
 * Executes crawl jobs using the appropriate crawler
 */

import type { CrawlJob, CrawlJobStatistics } from '@pathfinding/crawler-types';

import type { BaseCrawler } from '../crawlers/registry.js';
import { getCrawler, isPlatformSupported } from '../crawlers/registry.js';
import { createSpan } from '../middleware/tracing.js';
import { updateCrawlJobStatus } from '../services/crawl-job.service.js';

// Active crawlers for cancellation support
const activeCrawlers: Map<string, BaseCrawler> = new Map();

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000; // 1 second

/**
 * Execute a crawl job with retry logic and exponential backoff
 */
export async function executeCrawlJob(
  job: CrawlJob
): Promise<CrawlJobStatistics> {
  // Validate platform (no retry for validation errors)
  if (!isPlatformSupported(job.platform)) {
    const error = `Unsupported platform: ${job.platform}`;
    await updateCrawlJobStatus(job.id, 'failed', { errorMessage: error });
    throw new Error(error);
  }

  let lastError: Error | null = null;

  // Retry loop with exponential backoff
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Apply exponential backoff delay for retries
      if (attempt > 0) {
        const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
        console.warn(
          `[Worker] Retrying job ${job.id} (attempt ${attempt}/${MAX_RETRIES}) after ${backoffMs}ms backoff`
        );
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      } else {
        console.warn(`[Worker] Starting job ${job.id} for platform ${job.platform}`);
      }

      // Create crawler instance
      const crawler = getCrawler(job);
      activeCrawlers.set(job.id, crawler);

      try {
        // Execute crawl with tracing
        const statistics = await createSpan<CrawlJobStatistics>(
          `crawl:${job.platform}`,
          async (span) => {
            span.setAttribute('job_id', job.id);
            span.setAttribute('platform', job.platform);
            span.setAttribute('job_type', job.job_type);
            span.setAttribute('attempt', attempt);

            return await crawler.run();
          }
        );

        console.warn(`[Worker] Job ${job.id} completed:`, statistics);

        return statistics;
      } finally {
        activeCrawlers.delete(job.id);
      }
    } catch (error) {
      lastError = error as Error;
      console.error(
        `[Worker] Job ${job.id} failed on attempt ${attempt}/${MAX_RETRIES}:`,
        error
      );

      // If this was the last attempt, throw the error
      if (attempt === MAX_RETRIES) {
        throw error;
      }

      // Otherwise, continue to next retry with backoff
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError || new Error('Job failed with unknown error');
}

/**
 * Cancel a running crawl job
 */
export function cancelCrawlJob(jobId: string): boolean {
  const crawler = activeCrawlers.get(jobId);

  if (!crawler) {
    console.warn(`[Worker] No active crawler found for job ${jobId}`);
    return false;
  }

  console.warn(`[Worker] Cancelling job ${jobId}`);
  crawler.cancel();
  activeCrawlers.delete(jobId);

  return true;
}

/**
 * Get active job IDs
 */
export function getActiveJobIds(): string[] {
  return Array.from(activeCrawlers.keys());
}

/**
 * Check if a job is currently running
 */
export function isJobRunning(jobId: string): boolean {
  return activeCrawlers.has(jobId);
}

/**
 * Worker queue for managing concurrent jobs
 */
class WorkerQueue {
  private maxConcurrent: number;
  private running: number;
  private queue: Array<() => Promise<void>>;

  constructor(maxConcurrent: number = 3) {
    this.maxConcurrent = maxConcurrent;
    this.running = 0;
    this.queue = [];
  }

  async add(task: () => Promise<void>): Promise<void> {
    if (this.running < this.maxConcurrent) {
      this.running++;
      try {
        await task();
      } finally {
        this.running--;
        this.processQueue();
      }
    } else {
      return new Promise((resolve, reject) => {
        this.queue.push(async () => {
          try {
            await task();
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    }
  }

  private processQueue(): void {
    if (this.queue.length > 0 && this.running < this.maxConcurrent) {
      const task = this.queue.shift();
      if (task) {
        this.running++;
        task().finally(() => {
          this.running--;
          this.processQueue();
        });
      }
    }
  }

  get pendingCount(): number {
    return this.queue.length;
  }

  get runningCount(): number {
    return this.running;
  }
}

// Global worker queue
const MAX_CONCURRENT_JOBS = 3;
const workerQueue = new WorkerQueue(MAX_CONCURRENT_JOBS);

/**
 * Queue a crawl job for execution
 */
export async function queueCrawlJob(job: CrawlJob): Promise<void> {
  await workerQueue.add(async () => {
    await executeCrawlJob(job);
  });
}

/**
 * Get worker queue status
 */
export function getWorkerStatus(): {
  running: number;
  pending: number;
  activeJobs: string[];
  maxConcurrent: number;
  runningJobs: number;
} {
  return {
    running: workerQueue.runningCount,
    pending: workerQueue.pendingCount,
    activeJobs: getActiveJobIds(),
    maxConcurrent: MAX_CONCURRENT_JOBS,
    runningJobs: workerQueue.runningCount,
  };
}
