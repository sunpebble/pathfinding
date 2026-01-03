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

/**
 * Execute a crawl job
 */
export async function executeCrawlJob(
  job: CrawlJob
): Promise<CrawlJobStatistics> {
  // Validate platform
  if (!isPlatformSupported(job.platform)) {
    const error = `Unsupported platform: ${job.platform}`;
    await updateCrawlJobStatus(job.id, 'failed', { errorMessage: error });
    throw new Error(error);
  }

  console.warn(`[Worker] Starting job ${job.id} for platform ${job.platform}`);

  // Create crawler instance
  const crawler = getCrawler(job);
  activeCrawlers.set(job.id, crawler);

  try {
    // Execute crawl with tracing
    const statistics = (await createSpan(
      `crawl:${job.platform}`,
      async (span) => {
        span.setAttribute('job_id', job.id);
        span.setAttribute('platform', job.platform);
        span.setAttribute('job_type', job.job_type);

        return await crawler.run();
      }
    )) as unknown as CrawlJobStatistics;

    console.warn(`[Worker] Job ${job.id} completed:`, statistics);

    return statistics;
  } catch (error) {
    console.error(`[Worker] Job ${job.id} failed:`, error);
    throw error;
  } finally {
    activeCrawlers.delete(job.id);
  }
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
const workerQueue = new WorkerQueue(3);

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
} {
  return {
    running: workerQueue.runningCount,
    pending: workerQueue.pendingCount,
    activeJobs: getActiveJobIds(),
  };
}
