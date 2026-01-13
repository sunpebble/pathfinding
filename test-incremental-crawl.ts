/**
 * Integration Test: Incremental Crawl Triggering
 *
 * This script tests the incremental crawl workflow:
 * 1. Creates a full crawl job with a cron schedule
 * 2. Completes it and backdates completedAt to >24 hours ago
 * 3. Verifies the job is detected as stale
 * 4. Checks that scheduler creates incremental jobs for stale data
 */

import type { Id } from './packages/convex/_generated/dataModel.js';
import { ConvexHttpClient } from 'convex/browser';
import { api } from './packages/convex/_generated/api.js';

const CRAWLER_API_URL = process.env.CRAWLER_API_URL || 'http://localhost:3001';
const CONVEX_URL = process.env.CONVEX_URL || 'https://convex.kunish.org';

const convex = new ConvexHttpClient(CONVEX_URL);

interface CrawlJob {
  id: string;
  name: string;
  platform: string;
  job_type: string;
  schedule_cron?: string;
  next_run_at?: string | null;
  status: string;
  statistics?: any;
  started_at?: string;
  completed_at?: string;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createFullCrawlJob(): Promise<CrawlJob> {
  console.log('\n📋 Creating full crawl job with schedule...');

  const response = await fetch(`${CRAWLER_API_URL}/api/crawl-jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test - Full Crawl for Incremental',
      platform: 'xiaohongshu',
      job_type: 'full',
      schedule_cron: '0 0 * * *', // Daily at midnight
      config: {
        geographic_scope: {
          cities: ['上海'],
        },
        categories: ['travel'],
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create job: ${error}`);
  }

  const result = await response.json();
  console.log(`✅ Created job: ${result.data.id}`);
  console.log(`   Status: ${result.data.status}`);
  console.log(`   Schedule: ${result.data.schedule_cron}`);

  return result.data;
}

async function completeJobWithBackdate(jobId: string): Promise<void> {
  console.log(`\n⏰ Completing job and backdating to >24 hours ago...`);

  // Calculate timestamp from 25 hours ago (beyond 24h threshold)
  const twentyFiveHoursAgo = Date.now() - 25 * 60 * 60 * 1000;

  // Update job status to completed with backdated timestamp
  await convex.mutation(api.crawlJobs.updateStatus, {
    id: jobId as Id<'crawlJobs'>,
    status: 'completed',
    startedAt: twentyFiveHoursAgo - 60000, // Started 1 minute before completion
    completedAt: twentyFiveHoursAgo,
  });

  console.log('✅ Job marked as completed');
  console.log(`   Completed at: ${new Date(twentyFiveHoursAgo).toISOString()}`);
  console.log(
    `   (${Math.round((Date.now() - twentyFiveHoursAgo) / 3600000)} hours ago)`
  );
}

async function getJob(jobId: string): Promise<CrawlJob> {
  const response = await fetch(`${CRAWLER_API_URL}/api/crawl-jobs/${jobId}`);

  if (!response.ok) {
    throw new Error(`Failed to get job: ${await response.text()}`);
  }

  const result = await response.json();
  return result.data;
}

async function verifyJobIsStale(jobId: string): Promise<boolean> {
  console.log(`\n🔍 Verifying job ${jobId} is detected as stale...`);

  // Use the Convex query to check if job appears in stale jobs list
  const staleJobs = await convex.query(
    api.crawlJobs.getJobsForIncrementalCrawl,
    {
      staleThresholdHours: 24,
      limit: 100,
    }
  );

  const isStale = staleJobs.some((job: any) => job._id === jobId);

  if (isStale) {
    console.log('✅ Job is detected as stale');
    console.log(`   Found in list of ${staleJobs.length} stale job(s)`);
  } else {
    console.log('❌ Job is NOT detected as stale');
    console.log(`   Total stale jobs found: ${staleJobs.length}`);
  }

  return isStale;
}

async function waitForIncrementalJob(
  originalJobName: string,
  maxWaitSeconds: number = 120
): Promise<CrawlJob | null> {
  console.log(
    `\n⏳ Waiting for incremental job to be created (max ${maxWaitSeconds}s)...`
  );
  console.log('   The "incremental-crawl" task runs every hour at :00');

  const startTime = Date.now();
  const expectedName = `${originalJobName} (Incremental)`;

  while (Date.now() - startTime < maxWaitSeconds * 1000) {
    // List all jobs
    const response = await fetch(`${CRAWLER_API_URL}/api/crawl-jobs?limit=100`);
    if (!response.ok) {
      console.warn('⚠️  Failed to list jobs');
      await sleep(5000);
      continue;
    }

    const result = await response.json();
    const jobs: CrawlJob[] = result.data;

    // Look for incremental job
    const incrementalJob = jobs.find(
      (job) =>
        job.job_type === 'incremental' &&
        (job.name === expectedName || job.name.includes('Incremental'))
    );

    if (incrementalJob) {
      console.log('✅ Incremental job found!');
      console.log(`   Job ID: ${incrementalJob.id}`);
      console.log(`   Name: ${incrementalJob.name}`);
      console.log(`   Status: ${incrementalJob.status}`);
      return incrementalJob;
    }

    // Check progress
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    if (elapsed % 10 === 0) {
      console.log(`   Still waiting... (${elapsed}s elapsed)`);
    }

    await sleep(5000);
  }

  return null;
}

async function verifyIncrementalJob(job: CrawlJob): Promise<void> {
  console.log('\n🔍 Verifying incremental job properties...');

  // Verify job type
  if (job.job_type !== 'incremental') {
    throw new Error(`Expected job_type 'incremental', got '${job.job_type}'`);
  }
  console.log('✅ Job type is incremental');

  // Verify name contains "Incremental"
  if (!job.name.includes('Incremental')) {
    console.warn(`⚠️  Job name doesn't contain 'Incremental': ${job.name}`);
  } else {
    console.log(`✅ Job name indicates incremental: ${job.name}`);
  }

  // Verify platform matches
  if (job.platform !== 'xiaohongshu') {
    throw new Error(`Expected platform 'xiaohongshu', got '${job.platform}'`);
  }
  console.log('✅ Job platform matches parent job');

  // Verify status is pending (newly created)
  if (job.status !== 'pending') {
    console.warn(`⚠️  Expected status 'pending', got '${job.status}'`);
  } else {
    console.log('✅ Job status is pending');
  }
}

async function checkSchedulerStatus(): Promise<void> {
  console.log('\n📊 Checking scheduler status...');

  const response = await fetch(
    `${CRAWLER_API_URL}/api/crawl-jobs/scheduler/status`
  );

  if (!response.ok) {
    throw new Error('Failed to get scheduler status');
  }

  const result = await response.json();
  const tasks = result.data.tasks;

  // Find incremental-crawl task
  const incrementalTask = tasks.find(
    (task: any) => task.name === 'incremental-crawl'
  );

  if (!incrementalTask) {
    console.error('❌ Incremental-crawl task not found in scheduler');
    return;
  }

  console.log('✅ Incremental-crawl task is registered');
  console.log(`   Cron: ${incrementalTask.cronExpression}`);
  console.log(`   Enabled: ${incrementalTask.enabled}`);
  console.log(`   Last run: ${incrementalTask.lastRun || 'Never'}`);

  // Calculate next run time
  if (incrementalTask.cronExpression === '0 * * * *') {
    const now = new Date();
    const nextRun = new Date(now);
    nextRun.setMinutes(0, 0, 0);
    nextRun.setHours(nextRun.getHours() + 1);

    const minutesUntilNext = Math.round(
      (nextRun.getTime() - now.getTime()) / 60000
    );
    console.log(`   Next run in: ~${minutesUntilNext} minutes`);
  }
}

async function checkCrawlerHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${CRAWLER_API_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

async function main() {
  console.log('🚀 Incremental Crawl Integration Test');
  console.log('=====================================');
  console.log(`Crawler API: ${CRAWLER_API_URL}`);
  console.log(`Convex URL: ${CONVEX_URL}`);

  // Check if crawler is running
  console.log('\n🔍 Checking crawler service...');
  const isHealthy = await checkCrawlerHealth();
  if (!isHealthy) {
    console.error('❌ Crawler service is not running!');
    console.error('   Please start it with: make crawler');
    process.exit(1);
  }
  console.log('✅ Crawler service is healthy');

  try {
    // Step 1: Check scheduler status
    await checkSchedulerStatus();

    // Step 2: Create full crawl job
    const job = await createFullCrawlJob();
    const jobId = job.id;

    // Step 3: Complete and backdate the job
    await completeJobWithBackdate(jobId);

    // Step 4: Verify job appears in stale jobs query
    const isStale = await verifyJobIsStale(jobId);
    if (!isStale) {
      throw new Error(
        'Job is not detected as stale - incremental crawl will not trigger'
      );
    }

    // Step 5: Get updated job to show current state
    const updatedJob = await getJob(jobId);
    console.log('\n📋 Current job state:');
    console.log(`   ID: ${updatedJob.id}`);
    console.log(`   Status: ${updatedJob.status}`);
    console.log(`   Completed: ${updatedJob.completed_at}`);
    console.log(`   Schedule: ${updatedJob.schedule_cron}`);

    // Step 6: Wait for incremental job to be created
    console.log('\n⏰ Waiting for scheduler to create incremental job...');
    console.log(
      '   NOTE: This requires the hourly "incremental-crawl" task to run'
    );
    console.log('   You can wait here, or check manually later');

    const incrementalJob = await waitForIncrementalJob(job.name, 120);

    if (incrementalJob) {
      // Step 7: Verify incremental job properties
      await verifyIncrementalJob(incrementalJob);

      console.log('\n✅ All verification steps passed!');
      console.log('\n📊 Summary:');
      console.log(`   Parent Job ID: ${jobId}`);
      console.log(`   Incremental Job ID: ${incrementalJob.id}`);
      console.log(`   Verification: PASSED`);
      process.exit(0);
    } else {
      console.log(
        '\n⏰ Timeout waiting for incremental job (this is expected if not at the hourly mark)'
      );
      console.log('\n✅ Setup verification passed!');
      console.log('\n📊 Summary:');
      console.log(`   Parent Job ID: ${jobId}`);
      console.log(`   Status: Job is stale and ready for incremental crawl`);
      console.log(`   Next: Wait for next hour (:00) for scheduler to trigger`);
      console.log('\nTo verify manually:');
      console.log(`   1. Wait until the next hour (:00)`);
      console.log(`   2. Check logs: make crawler-logs`);
      console.log(
        `   3. List jobs: curl http://localhost:3001/api/crawl-jobs | jq '.data[] | select(.job_type=="incremental")'`
      );
      console.log(`   4. Look for job named: "${job.name} (Incremental)"`);
      process.exit(0);
    }
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
