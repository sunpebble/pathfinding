import type { CrawlOptions, CrawlResult } from './index.js';
import { createLogger } from '../logger.js';
import { crawlPlatform } from './index.js';

const log = createLogger('parallel-crawler');

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type CityStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface CityProgress {
  status: CityStatus;
  resultsCount: number;
  error?: string;
  startedAt?: number;
  completedAt?: number;
}

export interface PlatformProgress {
  cities: Record<string, CityProgress>;
  completedCount: number;
  failedCount: number;
  totalCount: number;
}

export interface JobProgress {
  jobId: string;
  status: JobStatus;
  platforms: Record<string, PlatformProgress>;
  summary: {
    total: number;
    completed: number;
    failed: number;
    pending: number;
  };
  startedAt: number;
  completedAt?: number;
  totalResults: number;
}

export interface ParallelCrawlOptions extends CrawlOptions {
  concurrencyPerPlatform?: number;
}

class ParallelCrawlerManager {
  private jobs: Map<string, JobProgress> = new Map();
  private activeJobId: string | null = null;
  private abortControllers: Map<string, AbortController> = new Map();

  generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  async startJob(
    jobId: string,
    platforms: string[],
    cities: string[],
    options: ParallelCrawlOptions = {},
  ): Promise<void> {
    if (this.activeJobId) {
      throw new Error(`Job ${this.activeJobId} is already running`);
    }

    const concurrency = options.concurrencyPerPlatform ?? 2;
    const abortController = new AbortController();
    this.abortControllers.set(jobId, abortController);
    this.activeJobId = jobId;

    const progress: JobProgress = {
      jobId,
      status: 'running',
      platforms: {},
      summary: {
        total: platforms.length * cities.length,
        completed: 0,
        failed: 0,
        pending: platforms.length * cities.length,
      },
      startedAt: Date.now(),
      totalResults: 0,
    };

    for (const platform of platforms) {
      progress.platforms[platform] = {
        cities: {},
        completedCount: 0,
        failedCount: 0,
        totalCount: cities.length,
      };
      for (const city of cities) {
        progress.platforms[platform].cities[city] = {
          status: 'pending',
          resultsCount: 0,
        };
      }
    }

    this.jobs.set(jobId, progress);

    try {
      const platformPromises = platforms.map(platform =>
        this.crawlPlatformCities(jobId, platform, cities, concurrency, options, abortController.signal),
      );

      await Promise.allSettled(platformPromises);

      const finalProgress = this.jobs.get(jobId)!;
      if (finalProgress.status !== 'cancelled') {
        finalProgress.status = finalProgress.summary.failed > 0 ? 'failed' : 'completed';
        finalProgress.completedAt = Date.now();
      }
    }
    catch (error) {
      const errorProgress = this.jobs.get(jobId)!;
      errorProgress.status = 'failed';
      errorProgress.completedAt = Date.now();
      log.error({ jobId, error }, 'Job failed');
    }
    finally {
      this.activeJobId = null;
      this.abortControllers.delete(jobId);
    }
  }

  private async crawlPlatformCities(
    jobId: string,
    platform: string,
    cities: string[],
    concurrency: number,
    options: CrawlOptions,
    signal: AbortSignal,
  ): Promise<void> {
    const chunks = this.chunkArray(cities, concurrency);

    for (const chunk of chunks) {
      if (signal.aborted)
        break;

      const cityPromises = chunk.map(city =>
        this.crawlCity(jobId, platform, city, options, signal),
      );

      await Promise.allSettled(cityPromises);
    }
  }

  private async crawlCity(
    jobId: string,
    platform: string,
    city: string,
    options: CrawlOptions,
    signal: AbortSignal,
  ): Promise<CrawlResult[]> {
    const progress = this.jobs.get(jobId);
    if (!progress || signal.aborted)
      return [];

    const cityProgress = progress.platforms[platform].cities[city];
    cityProgress.status = 'running';
    cityProgress.startedAt = Date.now();
    progress.summary.pending--;

    try {
      log.info({ jobId, platform, city }, 'Starting city crawl');
      const results = await crawlPlatform(platform, city, options);

      cityProgress.status = 'completed';
      cityProgress.resultsCount = results.length;
      cityProgress.completedAt = Date.now();
      progress.platforms[platform].completedCount++;
      progress.summary.completed++;
      progress.totalResults += results.length;

      log.info({ jobId, platform, city, count: results.length }, 'City crawl completed');
      return results;
    }
    catch (error) {
      cityProgress.status = 'failed';
      cityProgress.error = error instanceof Error ? error.message : String(error);
      cityProgress.completedAt = Date.now();
      progress.platforms[platform].failedCount++;
      progress.summary.failed++;

      log.error({ jobId, platform, city, error }, 'City crawl failed');
      return [];
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  getProgress(jobId: string): JobProgress | null {
    return this.jobs.get(jobId) || null;
  }

  cancelJob(jobId: string): boolean {
    const controller = this.abortControllers.get(jobId);
    if (controller) {
      controller.abort();
      const progress = this.jobs.get(jobId);
      if (progress) {
        progress.status = 'cancelled';
        progress.completedAt = Date.now();
      }
      if (this.activeJobId === jobId) {
        this.activeJobId = null;
      }
      return true;
    }
    return false;
  }

  listJobs(): JobProgress[] {
    return Array.from(this.jobs.values()).sort((a, b) => b.startedAt - a.startedAt);
  }

  isJobRunning(): boolean {
    return this.activeJobId !== null;
  }

  getActiveJobId(): string | null {
    return this.activeJobId;
  }
}

export const parallelCrawlerManager = new ParallelCrawlerManager();

export { ParallelCrawlerManager };
