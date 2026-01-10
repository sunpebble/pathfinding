/**
 * Job Scheduler
 * Cron-based scheduling for recurring crawl jobs
 */

import cron from 'node-cron';
import { createLogger } from '../lib/logger.js';
import { supabase, TABLES } from '../lib/supabase.js';
import { captureError, CrawlerMetrics } from '../monitoring/index.js';
import { runNormalizationPipeline } from '../processors/pipeline.js';
import { getCrawlJob } from '../services/crawl-job.service.js';
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
  // Get pending scheduled jobs that are due
  const now = new Date().toISOString();

  const { data: pendingJobs, error } = await supabase
    .from(TABLES.CRAWL_JOBS)
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_at', now)
    .order('scheduled_at', { ascending: true })
    .limit(10);

  if (error) {
    log.error(`Failed to fetch pending jobs: ${error.message}`);
    return;
  }

  if (!pendingJobs || pendingJobs.length === 0) {
    return;
  }

  log.info(`Found ${pendingJobs.length} pending jobs`);

  // Check worker capacity
  const status = getWorkerStatus();
  const availableSlots = status.maxConcurrent - status.runningJobs;

  if (availableSlots <= 0) {
    log.info('Worker queue is full, skipping...');
    return;
  }

  // Start jobs up to available capacity
  const jobsToStart = pendingJobs.slice(0, availableSlots);

  for (const job of jobsToStart) {
    try {
      await executeCrawlJob(job.id);
      CrawlerMetrics.recordCrawlJob('started', job.platform);
    } catch (error) {
      log.error(`Failed to start job ${job.id}:`, error);
    }
  }
}

/**
 * Trigger incremental crawl jobs for stale data
 */
async function triggerIncrementalCrawls(): Promise<void> {
  // Find source mappings that haven't been crawled recently
  const staleThreshold = new Date();
  staleThreshold.setDate(staleThreshold.getDate() - 7); // 7 days ago

  const { data: staleMappings, error } = await supabase
    .from(TABLES.POI_SOURCE_MAPPINGS)
    .select('platform')
    .lt('last_crawled_at', staleThreshold.toISOString())
    .limit(1000);

  if (error) {
    log.error(`Failed to check stale mappings: ${error.message}`);
    return;
  }

  if (!staleMappings || staleMappings.length === 0) {
    log.info('No stale data found, skipping incremental crawl');
    return;
  }

  // Group by platform and create incremental jobs
  const platformCounts: Record<string, number> = {};
  for (const mapping of staleMappings as Array<{ platform: string }>) {
    platformCounts[mapping.platform] =
      (platformCounts[mapping.platform] || 0) + 1;
  }

  log.info('Stale data by platform:', platformCounts);

  // Create incremental crawl jobs for platforms with significant stale data
  for (const [platform, count] of Object.entries(platformCounts)) {
    if (count >= 100) {
      // Only trigger if 100+ stale records
      log.info(
        `Creating incremental crawl job for ${platform} (${count} stale records)`
      );

      // Create a new crawl job for incremental update
      await supabase.from(TABLES.CRAWL_JOBS).insert({
        platform,
        job_type: 'incremental',
        status: 'pending',
        config: {
          mode: 'incremental',
          staleThresholdDays: 7,
        },
        scheduled_at: new Date().toISOString(),
      });
    }
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
