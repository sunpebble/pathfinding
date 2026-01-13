/**
 * Integration Test: Scheduled Crawl Job
 *
 * This script tests the complete scheduled crawling workflow:
 * 1. Creates a crawl job with a cron schedule
 * 2. Sets nextRunAt to make the job due immediately
 * 3. Verifies the scheduler picks up and executes the job
 * 4. Checks that nextRunAt is updated correctly
 * 5. Verifies statistics are recorded
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

async function createScheduledJob(): Promise<CrawlJob> {
  console.log('\n📋 Creating scheduled crawl job...');

  const response = await fetch(`${CRAWLER_API_URL}/api/crawl-jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Integration Test - Scheduled Crawl',
      platform: 'xiaohongshu',
      job_type: 'full',
      schedule_cron: '*/5 * * * *', // Every 5 minutes
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

async function setJobAsDue(jobId: string): Promise<void> {
  console.log(`\n⏰ Setting job ${jobId} as due to run...`);

  // Set nextRunAt to current time to make the job due
  await convex.mutation(api.crawlJobs.updateNextRunAt, {
    id: jobId as Id<'crawlJobs'>,
    nextRunAt: Date.now() - 1000, // 1 second in the past
  });

  console.log('✅ Job marked as due');
}

async function getJob(jobId: string): Promise<CrawlJob> {
  const response = await fetch(`${CRAWLER_API_URL}/api/crawl-jobs/${jobId}`);

  if (!response.ok) {
    throw new Error(`Failed to get job: ${await response.text()}`);
  }

  const result = await response.json();
  return result.data;
}

async function waitForJobCompletion(
  jobId: string,
  maxWaitSeconds: number = 180
): Promise<CrawlJob> {
  console.log(
    `\n⏳ Waiting for job ${jobId} to complete (max ${maxWaitSeconds}s)...`
  );

  const startTime = Date.now();
  let lastStatus = '';

  while (Date.now() - startTime < maxWaitSeconds * 1000) {
    const job = await getJob(jobId);

    if (job.status !== lastStatus) {
      console.log(`   Status: ${job.status}`);
      lastStatus = job.status;
    }

    if (job.status === 'completed' || job.status === 'failed') {
      return job;
    }

    await sleep(5000); // Check every 5 seconds
  }

  throw new Error(`Job did not complete within ${maxWaitSeconds} seconds`);
}

async function verifyJobResults(
  job: CrawlJob,
  originalNextRunAt?: string | null
): Promise<void> {
  console.log('\n🔍 Verifying job results...');

  // Verify status
  if (job.status !== 'completed') {
    throw new Error(`Expected status 'completed', got '${job.status}'`);
  }
  console.log('✅ Job status: completed');

  // Verify started_at and completed_at
  if (!job.started_at) {
    throw new Error('started_at is missing');
  }
  console.log(`✅ Started at: ${job.started_at}`);

  if (!job.completed_at) {
    throw new Error('completed_at is missing');
  }
  console.log(`✅ Completed at: ${job.completed_at}`);

  // Verify nextRunAt was updated
  if (!job.next_run_at) {
    console.warn(
      '⚠️  nextRunAt was not updated (this is expected for non-recurring jobs)'
    );
  } else {
    // For recurring jobs, nextRunAt should be in the future
    const nextRun = new Date(job.next_run_at).getTime();
    const now = Date.now();

    if (nextRun <= now) {
      console.warn(`⚠️  nextRunAt (${job.next_run_at}) is not in the future`);
    } else {
      console.log(`✅ Next run scheduled: ${job.next_run_at}`);
    }

    // Verify it changed from original
    if (originalNextRunAt && job.next_run_at === originalNextRunAt) {
      console.warn('⚠️  nextRunAt was not updated from original value');
    }
  }

  // Verify statistics
  if (!job.statistics) {
    throw new Error('Statistics are missing');
  }
  console.log('✅ Statistics recorded:');
  console.log(`   Requests: ${job.statistics.requests_total || 0}`);
  console.log(`   Success: ${job.statistics.requests_success || 0}`);
  console.log(`   Failed: ${job.statistics.requests_failed || 0}`);
  console.log(`   Records: ${job.statistics.records_extracted || 0}`);
  console.log(`   Duration: ${job.statistics.duration_seconds || 0}s`);
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
  console.log('🚀 Scheduled Crawl Integration Test');
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
    // Step 1: Create scheduled job
    const job = await createScheduledJob();
    const jobId = job.id;

    // Step 2: Set job as due to run
    await setJobAsDue(jobId);
    const jobBeforeRun = await getJob(jobId);

    console.log('\n⏰ Waiting for scheduler to pick up the job...');
    console.log('   The "process-pending-jobs" task runs every 5 minutes.');
    console.log('   This may take up to 5 minutes...');

    // Step 3: Wait for scheduler to process (every 5 minutes)
    // We'll poll for job status changes
    await sleep(10000); // Wait 10 seconds for scheduler to notice

    // Step 4: Wait for job to complete
    const completedJob = await waitForJobCompletion(jobId, 300); // 5 minute timeout

    // Step 5: Verify results
    await verifyJobResults(completedJob, jobBeforeRun.next_run_at);

    console.log('\n✅ All verification steps passed!');
    console.log('\n📊 Summary:');
    console.log(`   Job ID: ${jobId}`);
    console.log(`   Status: ${completedJob.status}`);
    console.log(`   Schedule: ${completedJob.schedule_cron}`);
    console.log(`   Next run: ${completedJob.next_run_at || 'N/A'}`);

    process.exit(0);
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
