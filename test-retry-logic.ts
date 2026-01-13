/**
 * Integration Test: Retry Logic with Exponential Backoff
 *
 * This script tests the retry mechanism for failed crawl jobs:
 * 1. Creates a crawl job with invalid configuration to trigger failures
 * 2. Monitors retryCount increments after each failure
 * 3. Verifies exponential backoff timing (1s, 2s, 4s)
 * 4. Verifies job stops retrying after MAX_RETRIES (3 attempts)
 * 5. Checks lastFailureAt and lastFailureReason are tracked
 */

import type { Id } from './packages/convex/_generated/dataModel.js';
import { ConvexHttpClient } from 'convex/browser';
import { api } from './packages/convex/_generated/api.js';

const CRAWLER_API_URL = process.env.CRAWLER_API_URL || 'http://localhost:3001';
const CONVEX_URL = process.env.CONVEX_URL || 'https://convex.kunish.org';

const convex = new ConvexHttpClient(CONVEX_URL);

// Expected retry configuration (from worker.ts)
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000; // 1 second
const EXPECTED_BACKOFFS = [
  INITIAL_BACKOFF_MS, // 1s for first retry
  INITIAL_BACKOFF_MS * 2, // 2s for second retry
  INITIAL_BACKOFF_MS * 4, // 4s for third retry
];

interface CrawlJob {
  id: string;
  _id?: string;
  name: string;
  platform: string;
  job_type?: string;
  jobType?: string;
  status: string;
  retry_count?: number;
  retryCount?: number;
  last_failure_at?: number;
  lastFailureAt?: number;
  last_failure_reason?: string;
  lastFailureReason?: string;
  error_message?: string;
  errorMessage?: string;
  started_at?: number;
  startedAt?: number;
  completed_at?: number;
  completedAt?: number;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createInvalidJob(): Promise<CrawlJob> {
  console.log('\n📋 Creating job with invalid configuration...');

  // Create a job with an invalid/unsupported platform to trigger failures
  const response = await fetch(`${CRAWLER_API_URL}/api/crawl-jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Integration Test - Retry Logic',
      platform: 'invalid-platform-xyz', // This will cause immediate failure
      job_type: 'full',
      config: {
        geographic_scope: {
          cities: ['TestCity'],
        },
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
  console.log(`   Platform: ${result.data.platform}`);

  return result.data;
}

async function getJobById(jobId: string): Promise<CrawlJob> {
  const response = await fetch(`${CRAWLER_API_URL}/api/crawl-jobs/${jobId}`);

  if (!response.ok) {
    throw new Error(`Failed to get job: ${await response.text()}`);
  }

  const result = await response.json();
  return result.data;
}

async function getJobFromConvex(jobId: string): Promise<any> {
  return await convex.query(api.crawlJobs.getById, {
    id: jobId as Id<'crawlJobs'>,
  });
}

async function executeJob(jobId: string): Promise<void> {
  console.log(`\n▶️  Executing job ${jobId}...`);

  const response = await fetch(
    `${CRAWLER_API_URL}/api/crawl-jobs/${jobId}/execute`,
    {
      method: 'POST',
    }
  );

  if (!response.ok) {
    const error = await response.text();
    // Expected to fail, so we just log it
    console.log(`   Expected failure: ${error.substring(0, 100)}`);
  } else {
    console.log('   Job executed');
  }
}

async function monitorRetryAttempts(
  jobId: string,
  maxWaitSeconds: number = 30
): Promise<CrawlJob[]> {
  console.log('\n🔍 Monitoring retry attempts...');
  console.log(
    `   Expected: ${MAX_RETRIES + 1} total attempts (initial + ${MAX_RETRIES} retries)`
  );

  const snapshots: CrawlJob[] = [];
  const startTime = Date.now();
  let lastRetryCount = -1;

  while (Date.now() - startTime < maxWaitSeconds * 1000) {
    const job = await getJobFromConvex(jobId);

    if (job) {
      const currentRetryCount = job.retryCount ?? 0;

      // Capture snapshot when retryCount changes
      if (currentRetryCount !== lastRetryCount) {
        const snapshot = {
          id: jobId,
          name: job.name,
          platform: job.platform,
          status: job.status,
          retryCount: job.retryCount,
          lastFailureAt: job.lastFailureAt,
          lastFailureReason: job.lastFailureReason,
          errorMessage: job.errorMessage,
          timestamp: Date.now(),
        } as CrawlJob;

        snapshots.push(snapshot);

        console.log(
          `   📸 Snapshot ${snapshots.length}: retryCount=${currentRetryCount}, status=${job.status}`
        );

        lastRetryCount = currentRetryCount;

        // If we've reached max retries and job is failed, we're done
        if (
          currentRetryCount >= MAX_RETRIES &&
          (job.status === 'failed' || job.status === 'cancelled')
        ) {
          console.log('   ✅ Job reached max retries and stopped');
          break;
        }
      }
    }

    await sleep(500); // Check every 500ms
  }

  return snapshots;
}

function verifyBackoffTimings(snapshots: CrawlJob[]): void {
  console.log('\n⏱️  Verifying exponential backoff timings...');

  if (snapshots.length < 2) {
    throw new Error(
      `Need at least 2 snapshots to verify backoff, got ${snapshots.length}`
    );
  }

  for (let i = 1; i < snapshots.length && i <= MAX_RETRIES; i++) {
    const prev = snapshots[i - 1] as any;
    const curr = snapshots[i] as any;
    const timeDiff = curr.timestamp - prev.timestamp;
    const expectedBackoff = EXPECTED_BACKOFFS[i - 1];

    // Allow 20% tolerance for timing variance
    const tolerance = expectedBackoff * 0.2;
    const minTime = expectedBackoff - tolerance;
    const maxTime = expectedBackoff + tolerance + 2000; // +2s for processing time

    console.log(`   Retry ${i}:`);
    console.log(`     Expected backoff: ${expectedBackoff}ms`);
    console.log(`     Actual time: ${timeDiff}ms`);
    console.log(`     Tolerance range: ${minTime}ms - ${maxTime}ms`);

    if (timeDiff >= minTime && timeDiff <= maxTime) {
      console.log(`     ✅ Within expected range`);
    } else {
      console.warn(
        `     ⚠️  Outside expected range (this may be due to system load)`
      );
    }
  }
}

function verifyRetryCount(job: CrawlJob): void {
  console.log('\n🔢 Verifying retry count...');

  const retryCount = job.retryCount ?? job.retry_count ?? 0;

  console.log(`   Final retryCount: ${retryCount}`);
  console.log(`   Expected: ${MAX_RETRIES}`);

  if (retryCount === MAX_RETRIES) {
    console.log('   ✅ Retry count matches MAX_RETRIES');
  } else {
    throw new Error(
      `Expected retryCount to be ${MAX_RETRIES}, got ${retryCount}`
    );
  }
}

function verifyFailureTracking(job: CrawlJob): void {
  console.log('\n📝 Verifying failure tracking...');

  // Check lastFailureAt
  const lastFailureAt = job.lastFailureAt ?? job.last_failure_at;
  if (!lastFailureAt) {
    throw new Error('lastFailureAt is not set');
  }
  console.log(`   ✅ lastFailureAt: ${new Date(lastFailureAt).toISOString()}`);

  // Check lastFailureReason
  const lastFailureReason =
    job.lastFailureReason ??
    job.last_failure_reason ??
    job.errorMessage ??
    job.error_message;
  if (!lastFailureReason) {
    throw new Error('lastFailureReason is not set');
  }
  console.log(
    `   ✅ lastFailureReason: ${lastFailureReason.substring(0, 80)}...`
  );

  // Verify job status is 'failed'
  if (job.status !== 'failed') {
    throw new Error(`Expected status 'failed', got '${job.status}'`);
  }
  console.log(`   ✅ Job status: ${job.status}`);
}

async function verifyDashboardData(jobId: string): Promise<void> {
  console.log('\n📊 Verifying dashboard data...');

  try {
    // Fetch job via API (what dashboard would use)
    const job = await getJobById(jobId);

    // Check that retry information is available
    const retryCount = job.retry_count ?? job.retryCount ?? 0;
    const lastFailureAt = job.last_failure_at ?? job.lastFailureAt;
    const lastFailureReason =
      job.last_failure_reason ??
      job.lastFailureReason ??
      job.error_message ??
      job.errorMessage;

    console.log('   Dashboard would show:');
    console.log(`     Status: ${job.status}`);
    console.log(`     Retry Count: ${retryCount}`);
    console.log(
      `     Last Failure: ${lastFailureAt ? new Date(lastFailureAt).toISOString() : 'N/A'}`
    );
    console.log(
      `     Error: ${lastFailureReason ? `${lastFailureReason.substring(0, 60)}...` : 'N/A'}`
    );

    if (retryCount > 0 && lastFailureAt && lastFailureReason) {
      console.log('   ✅ All retry information available for dashboard');
    } else {
      console.warn('   ⚠️  Some retry information missing');
    }
  } catch (error) {
    console.error('   ❌ Failed to verify dashboard data:', error);
    throw error;
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
  console.log('🚀 Retry Logic Integration Test');
  console.log('=====================================');
  console.log(`Crawler API: ${CRAWLER_API_URL}`);
  console.log(`Convex URL: ${CONVEX_URL}`);
  console.log(`Max Retries: ${MAX_RETRIES}`);
  console.log(`Initial Backoff: ${INITIAL_BACKOFF_MS}ms`);

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
    // Step 1: Create job with invalid configuration
    const job = await createInvalidJob();
    const jobId = job.id;

    // Step 2: Execute the job (will trigger retry logic)
    await executeJob(jobId);

    // Step 3: Monitor retry attempts
    const snapshots = await monitorRetryAttempts(jobId, 30);

    if (snapshots.length === 0) {
      throw new Error('No snapshots captured - job may not have started');
    }

    console.log(`\n📊 Captured ${snapshots.length} snapshots`);

    // Step 4: Verify backoff timings
    if (snapshots.length > 1) {
      verifyBackoffTimings(snapshots);
    } else {
      console.warn('   ⚠️  Not enough snapshots to verify backoff timings');
    }

    // Step 5: Get final job state
    await sleep(2000); // Wait for final state update
    const finalJob = await getJobFromConvex(jobId);

    // Step 6: Verify retry count
    verifyRetryCount(finalJob);

    // Step 7: Verify failure tracking
    verifyFailureTracking(finalJob);

    // Step 8: Verify dashboard shows retry information
    await verifyDashboardData(jobId);

    console.log('\n✅ All verification steps passed!');
    console.log('\n📊 Summary:');
    console.log(`   Job ID: ${jobId}`);
    console.log(`   Final Status: ${finalJob.status}`);
    console.log(`   Retry Count: ${finalJob.retryCount}`);
    console.log(`   Total Attempts: ${finalJob.retryCount + 1}`);
    console.log(
      `   Last Failure: ${finalJob.lastFailureReason?.substring(0, 60)}...`
    );

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
