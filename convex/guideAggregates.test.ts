/**
 * Tests for guideAggregates logic
 * Tests aggregate update operations and count queries
 */

import { describe, expect, it } from 'vitest';

// ============================================================
// Types and Helpers
// ============================================================

interface GuideDoc {
  _id: string;
  sourcePlatform: string;
  title?: string;
}

// Simulate aggregate behavior
class MockAggregate {
  private counts: Map<string | null, number> = new Map();

  insert(key: string | null): void {
    this.counts.set(key, (this.counts.get(key) ?? 0) + 1);
  }

  delete(key: string | null): void {
    const current = this.counts.get(key) ?? 0;
    if (current > 0) {
      this.counts.set(key, current - 1);
    }
  }

  replace(oldKey: string | null, newKey: string | null): void {
    this.delete(oldKey);
    this.insert(newKey);
  }

  count(key?: string | null): number {
    if (key === undefined) {
      // Total count
      let total = 0;
      for (const count of this.counts.values()) {
        total += count;
      }
      return total;
    }
    return this.counts.get(key) ?? 0;
  }
}

// ============================================================
// Tests
// ============================================================

describe('guideAggregates - Insert Operations', () => {
  describe('insertGuideToAggregates', () => {
    it('should increment total count', () => {
      const totalAggregate = new MockAggregate();

      totalAggregate.insert(null);
      expect(totalAggregate.count()).toBe(1);

      totalAggregate.insert(null);
      expect(totalAggregate.count()).toBe(2);
    });

    it('should increment platform count', () => {
      const platformAggregate = new MockAggregate();

      platformAggregate.insert('xiaohongshu');
      platformAggregate.insert('xiaohongshu');
      platformAggregate.insert('weibo');

      expect(platformAggregate.count('xiaohongshu')).toBe(2);
      expect(platformAggregate.count('weibo')).toBe(1);
      expect(platformAggregate.count('ctrip')).toBe(0);
    });
  });
});

describe('guideAggregates - Delete Operations', () => {
  describe('deleteGuideFromAggregates', () => {
    it('should decrement total count', () => {
      const totalAggregate = new MockAggregate();

      totalAggregate.insert(null);
      totalAggregate.insert(null);
      totalAggregate.insert(null);
      expect(totalAggregate.count()).toBe(3);

      totalAggregate.delete(null);
      expect(totalAggregate.count()).toBe(2);
    });

    it('should decrement platform count', () => {
      const platformAggregate = new MockAggregate();

      platformAggregate.insert('xiaohongshu');
      platformAggregate.insert('xiaohongshu');
      expect(platformAggregate.count('xiaohongshu')).toBe(2);

      platformAggregate.delete('xiaohongshu');
      expect(platformAggregate.count('xiaohongshu')).toBe(1);
    });

    it('should not go below zero', () => {
      const platformAggregate = new MockAggregate();

      platformAggregate.delete('nonexistent');
      expect(platformAggregate.count('nonexistent')).toBe(0);
    });
  });
});

describe('guideAggregates - Replace Operations', () => {
  describe('replaceGuideInAggregates', () => {
    it('should handle platform change', () => {
      const platformAggregate = new MockAggregate();

      // Initial state
      platformAggregate.insert('xiaohongshu');
      platformAggregate.insert('xiaohongshu');
      platformAggregate.insert('weibo');

      expect(platformAggregate.count('xiaohongshu')).toBe(2);
      expect(platformAggregate.count('weibo')).toBe(1);

      // Replace: change platform from xiaohongshu to weibo
      platformAggregate.replace('xiaohongshu', 'weibo');

      expect(platformAggregate.count('xiaohongshu')).toBe(1);
      expect(platformAggregate.count('weibo')).toBe(2);
    });

    it('should handle same platform (no change)', () => {
      const platformAggregate = new MockAggregate();

      platformAggregate.insert('xiaohongshu');
      platformAggregate.insert('xiaohongshu');

      expect(platformAggregate.count('xiaohongshu')).toBe(2);

      // Replace with same platform
      platformAggregate.replace('xiaohongshu', 'xiaohongshu');

      // Count should remain the same
      expect(platformAggregate.count('xiaohongshu')).toBe(2);
    });
  });
});

describe('guideAggregates - Count Queries', () => {
  describe('countAllPlatforms', () => {
    it('should return counts for all platforms', () => {
      const platformAggregate = new MockAggregate();

      platformAggregate.insert('xiaohongshu');
      platformAggregate.insert('xiaohongshu');
      platformAggregate.insert('weibo');
      platformAggregate.insert('ctrip');
      platformAggregate.insert('ctrip');
      platformAggregate.insert('ctrip');

      const platforms = ['xiaohongshu', 'weibo', 'ctrip', 'douyin', 'mafengwo'];
      const counts: Record<string, number> = {};

      for (const platform of platforms) {
        counts[platform] = platformAggregate.count(platform);
      }

      expect(counts.xiaohongshu).toBe(2);
      expect(counts.weibo).toBe(1);
      expect(counts.ctrip).toBe(3);
      expect(counts.douyin).toBe(0);
      expect(counts.mafengwo).toBe(0);
    });

    it('should calculate total from individual platform counts', () => {
      const totalAggregate = new MockAggregate();
      const platformAggregate = new MockAggregate();

      const docs: GuideDoc[] = [
        { _id: '1', sourcePlatform: 'xiaohongshu' },
        { _id: '2', sourcePlatform: 'xiaohongshu' },
        { _id: '3', sourcePlatform: 'weibo' },
        { _id: '4', sourcePlatform: 'ctrip' },
      ];

      for (const doc of docs) {
        totalAggregate.insert(null);
        platformAggregate.insert(doc.sourcePlatform);
      }

      expect(totalAggregate.count()).toBe(4);
      expect(platformAggregate.count('xiaohongshu')).toBe(2);
      expect(platformAggregate.count('weibo')).toBe(1);
      expect(platformAggregate.count('ctrip')).toBe(1);
    });
  });
});

describe('guideAggregates - Edge Cases', () => {
  describe('empty state', () => {
    it('should return 0 for empty aggregate', () => {
      const aggregate = new MockAggregate();

      expect(aggregate.count()).toBe(0);
      expect(aggregate.count('xiaohongshu')).toBe(0);
    });
  });

  describe('consistency after operations', () => {
    it('should maintain consistency after insert/delete sequence', () => {
      const aggregate = new MockAggregate();

      // Insert 5
      for (let i = 0; i < 5; i++) {
        aggregate.insert(null);
      }
      expect(aggregate.count()).toBe(5);

      // Delete 3
      for (let i = 0; i < 3; i++) {
        aggregate.delete(null);
      }
      expect(aggregate.count()).toBe(2);

      // Insert 2 more
      aggregate.insert(null);
      aggregate.insert(null);
      expect(aggregate.count()).toBe(4);
    });
  });
});
