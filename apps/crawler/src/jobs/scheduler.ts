/**
 * Job Scheduler
 * Cron-based scheduling for recurring crawl jobs
 */

import cron from 'node-cron';
import { createLogger } from '../lib/logger.js';
import { captureError } from '../monitoring/index.js';
import { runNormalizationPipeline } from '../processors/pipeline.js';
import { createCrawlJob, getCrawlJob, getPendingScheduledJobs, listCrawlJobs } from '../services/crawl-job.service.js';
import { generateQualityReport } from '../services/quality-report.service.js';
import { executeCrawlJob, getWorkerStatus } from './worker.js';

const log = createLogger('Scheduler');

interface ScheduledTask {
  name: string;
  cronExpression: string;
  enabled: boolean;
  task: cron.ScheduledTask | null;
  lastRun?: string;
  nextRun?: string;
}

// Registered scheduled tasks
const scheduledTasks: Map<string, ScheduledTask> = new Map();

/**
 * Initialize the scheduler with default tasks
 */
export function initScheduler(): void {
  log.info('Initializing job scheduler...');

  // Schedule pending job processor (every 5 minutes)
  scheduleTask('process-pending-jobs', '*/5 * * * *', async () => {
    log.info('Processing pending crawl jobs...');
    await processPendingJobs();
  });

  // Schedule normalization pipeline (every 15 minutes)
  scheduleTask('run-normalization', '*/15 * * * *', async () => {
    log.info('Running normalization pipeline...');
    await runNormalizationPipeline({
      batchSize: 500,
      runDeduplication: true,
    });
  });

  // Schedule daily quality report (at 2 AM)
  scheduleTask('daily-quality-report', '0 2 * * *', async () => {
    log.info('Generating daily quality report...');
    await generateQualityReport({ reportType: 'daily' });
  });

  // Schedule weekly quality report (Sunday at 3 AM)
  scheduleTask('weekly-quality-report', '0 3 * * 0', async () => {
    log.info('Generating weekly quality report...');
    await generateQualityReport({ reportType: 'weekly' });
  });

  // Schedule incremental crawl jobs (every hour)
  scheduleTask('incremental-crawl', '0 * * * *', async () => {
    log.info('Checking for incremental crawl jobs...');
    await triggerIncrementalCrawls();
  });

  log.info(`Scheduler initialized with ${scheduledTasks.size} tasks`);
}

/**
 * Schedule a recurring task
 */
export function scheduleTask(
  name: string,
  cronExpression: string,
  handler: () => Promise<void>,
  enabled: boolean = true
): void {
  // Stop existing task if any
  const existing = scheduledTasks.get(name);
  if (existing?.task) {
    existing.task.stop();
  }

  // Create new task
  const task: ScheduledTask = {
    name,
    cronExpression,
    enabled,
    task: null,
  };

  if (enabled && cron.validate(cronExpression)) {
    task.task = cron.schedule(cronExpression, async () => {
      task.lastRun = new Date().toISOString();
      try {
        await handler();
      } catch (error) {
        log.error(`Task ${name} failed:`, error);
        captureError(
          error instanceof Error ? error : new Error(String(error)),
          {
            task: name,
          }
        );
      }
    });
  }

  scheduledTasks.set(name, task);
}

/**
 * Stop a scheduled task
 */
export function stopTask(name: string): boolean {
  const task = scheduledTasks.get(name);
  if (task?.task) {
    task.task.stop();
    task.enabled = false;
    return true;
  }
  return false;
}

/**
 * Start a stopped task
 */
export function startTask(name: string): boolean {
  const task = scheduledTasks.get(name);
  if (task?.task) {
    task.task.start();
    task.enabled = true;
    return true;
  }
  return false;
}

/**
 * Get status of all scheduled tasks
 */
export function getSchedulerStatus(): {
  tasks: Array<{
    name: string;
    cronExpression: string;
    enabled: boolean;
    lastRun?: string;
  }>;
  workerStatus: ReturnType<typeof getWorkerStatus>;
} {
  const tasks = Array.from(scheduledTasks.values()).map((t) => ({
    name: t.name,
    cronExpression: t.cronExpression,
    enabled: t.enabled,
    lastRun: t.lastRun,
  }));

  return {
    tasks,
    workerStatus: getWorkerStatus(),
  };
}

/**
 * Process pending scheduled jobs
 */
async function processPendingJobs(): Promise<void> {
  try {
    const jobs = await getPendingScheduledJobs();

    if (jobs.length === 0) {
      return;
    }

    log.info(`Found ${jobs.length} pending scheduled job(s)`);

    for (const job of jobs) {
      try {
        log.info(`Executing scheduled job: ${job.name} (${job.id})`);
        await executeCrawlJob(job);
      } catch (error) {
        log.error(`Failed to execute job ${job.id}:`, error);
        captureError(
          error instanceof Error ? error : new Error(String(error)),
          {
            jobId: job.id,
            jobName: job.name,
            platform: job.platform,
          }
        );
      }
    }
  } catch (error) {
    log.error('Failed to process pending jobs:', error);
    captureError(
      error instanceof Error ? error : new Error(String(error)),
      {
        operation: 'processPendingJobs',
      }
    );
  }
}

/**
 * Trigger incremental crawl jobs for stale data
 */
async function triggerIncrementalCrawls(): Promise<void> {
  try {
    // Get all completed jobs with schedules
    const jobs = await listCrawlJobs({ status: 'completed' });

    if (jobs.data.length === 0) {
      return;
    }

    // Filter for stale jobs (completed more than 24 hours ago)
    const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours
    const now = Date.now();
    const staleJobs = jobs.data.filter((job) => {
      if (!job.completed_at || !job.schedule_cron) {
        return false;
      }

      const completedAt = new Date(job.completed_at).getTime();
      return now - completedAt > STALE_THRESHOLD_MS;
    });

    if (staleJobs.length === 0) {
      log.info('No stale jobs found for incremental crawl');
      return;
    }

    log.info(`Found ${staleJobs.length} stale job(s) for incremental crawl`);

    // Create incremental crawl jobs for stale data
    for (const job of staleJobs) {
      try {
        const incrementalJob = await createCrawlJob({
          name: `${job.name} (Incremental)`,
          platform: job.platform,
          job_type: 'incremental',
          config: job.config,
        });

        log.info(`Created incremental crawl job: ${incrementalJob.id} for ${job.name}`);
      } catch (error) {
        log.error(`Failed to create incremental job for ${job.id}:`, error);
        captureError(
          error instanceof Error ? error : new Error(String(error)),
          {
            parentJobId: job.id,
            jobName: job.name,
            platform: job.platform,
          }
        );
      }
    }
  } catch (error) {
    log.error('Failed to trigger incremental crawls:', error);
    captureError(
      error instanceof Error ? error : new Error(String(error)),
      {
        operation: 'triggerIncrementalCrawls',
      }
    );
  }
}

/**
 * Schedule a one-time job to run at a specific time
 */
export async function scheduleOnceAt(
  jobId: string,
  runAt: Date
): Promise<void> {
  const delay = runAt.getTime() - Date.now();

  const executeJob = async () => {
    const job = await getCrawlJob(jobId);
    if (!job) {
      log.error(`Job ${jobId} not found`);
      return;
    }
    await executeCrawlJob(job);
  };

  if (delay <= 0) {
    // Run immediately
    await executeJob();
    return;
  }

  // Schedule to run after delay
  setTimeout(async () => {
    try {
      await executeJob();
    } catch (error) {
      log.error(`Failed to execute scheduled job ${jobId}:`, error);
    }
  }, delay);
}

/**
 * Stop all scheduled tasks
 */
export function stopScheduler(): void {
  log.info('Stopping scheduler...');
  for (const [name, task] of scheduledTasks) {
    if (task.task) {
      task.task.stop();
      log.info(`Stopped task: ${name}`);
    }
  }
  scheduledTasks.clear();
}
