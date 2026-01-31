import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ParallelCrawlerManager } from '../parallel-crawler.js';

vi.mock('../index.js', () => ({
  crawlPlatform: vi.fn().mockResolvedValue([
    { sourceExternalId: 'test-1', content: 'Test content' },
  ]),
}));

describe('parallelCrawlerManager', () => {
  let manager: ParallelCrawlerManager;

  beforeEach(() => {
    manager = new ParallelCrawlerManager();
  });

  describe('generateJobId', () => {
    it('should generate unique job IDs', () => {
      const id1 = manager.generateJobId();
      const id2 = manager.generateJobId();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^job_\d+_[a-z0-9]+$/);
    });
  });

  describe('startJob', () => {
    it('should create job with pending status initially', async () => {
      const jobId = manager.generateJobId();
      const startPromise = manager.startJob(jobId, ['ctrip'], ['北京'], { maxPages: 1 });

      const progress = manager.getProgress(jobId);
      expect(progress).not.toBeNull();
      expect(progress?.jobId).toBe(jobId);

      await startPromise;
    });

    it('should track progress correctly', async () => {
      const jobId = manager.generateJobId();
      await manager.startJob(jobId, ['ctrip'], ['北京', '上海'], { maxPages: 1 });

      const progress = manager.getProgress(jobId);
      expect(progress?.status).toBe('completed');
      expect(progress?.summary.total).toBe(2);
      expect(progress?.summary.completed).toBe(2);
    });

    it('should prevent multiple concurrent jobs', async () => {
      const jobId1 = manager.generateJobId();
      const jobId2 = manager.generateJobId();

      const promise1 = manager.startJob(jobId1, ['ctrip'], ['北京'], { maxPages: 1 });

      await expect(
        manager.startJob(jobId2, ['ctrip'], ['上海'], { maxPages: 1 }),
      ).rejects.toThrow(/already running/);

      await promise1;
    });
  });

  describe('getProgress', () => {
    it('should return null for non-existent job', () => {
      expect(manager.getProgress('non-existent')).toBeNull();
    });

    it('should return correct progress structure', async () => {
      const jobId = manager.generateJobId();
      await manager.startJob(jobId, ['ctrip'], ['北京'], { maxPages: 1 });

      const progress = manager.getProgress(jobId);
      expect(progress).toMatchObject({
        jobId,
        status: 'completed',
        platforms: {
          ctrip: {
            cities: {
              北京: {
                status: 'completed',
                resultsCount: 1,
              },
            },
          },
        },
        summary: {
          total: 1,
          completed: 1,
          failed: 0,
          pending: 0,
        },
      });
    });
  });

  describe('cancelJob', () => {
    it('should return false for non-existent job', () => {
      expect(manager.cancelJob('non-existent')).toBe(false);
    });
  });

  describe('listJobs', () => {
    it('should return all jobs sorted by start time', async () => {
      const jobId1 = manager.generateJobId();
      await manager.startJob(jobId1, ['ctrip'], ['北京'], { maxPages: 1 });

      const jobs = manager.listJobs();
      expect(jobs.length).toBe(1);
      expect(jobs[0].jobId).toBe(jobId1);
    });
  });

  describe('isJobRunning', () => {
    it('should return false when no job is running', () => {
      expect(manager.isJobRunning()).toBe(false);
    });
  });
});
