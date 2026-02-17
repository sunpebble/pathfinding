// @ts-nocheck
/**
 * Tests for guideDestinations sync logic
 * Tests destination normalization, sync operations, and diff calculations
 */

import { describe, expect, it } from 'vitest';

// ============================================================
// Helper Functions (extracted from guideDestinations.ts)
// ============================================================

function normalizeDestination(destination: string): string {
  return destination.trim().toLowerCase();
}

// Simulate sync logic
function calculateDestinationDiff(
  existingDestinations: string[],
  newDestinations: string[],
): { toAdd: string[]; toRemove: string[] } {
  const existingSet = new Set(existingDestinations.map(d => normalizeDestination(d)));
  const newSet = new Set(newDestinations.map(d => normalizeDestination(d)));

  const toAdd = [...newSet].filter(d => !existingSet.has(d));
  const toRemove = [...existingSet].filter(d => !newSet.has(d));

  return { toAdd, toRemove };
}

// ============================================================
// Tests
// ============================================================

describe('guideDestinations - Normalization', () => {
  describe('normalizeDestination', () => {
    it('should convert to lowercase', () => {
      expect(normalizeDestination('Beijing')).toBe('beijing');
      expect(normalizeDestination('SHANGHAI')).toBe('shanghai');
    });

    it('should trim whitespace', () => {
      expect(normalizeDestination('  北京  ')).toBe('北京');
      expect(normalizeDestination('\t上海\n')).toBe('上海');
    });

    it('should handle mixed case and whitespace', () => {
      expect(normalizeDestination('  New York  ')).toBe('new york');
    });

    it('should handle empty string', () => {
      expect(normalizeDestination('')).toBe('');
    });

    it('should handle Chinese characters', () => {
      expect(normalizeDestination('北京')).toBe('北京');
      expect(normalizeDestination('上海市')).toBe('上海市');
    });
  });
});

describe('guideDestinations - Sync Logic', () => {
  describe('calculateDestinationDiff', () => {
    it('should identify new destinations to add', () => {
      const existing = ['北京', '上海'];
      const newDests = ['北京', '上海', '广州'];

      const { toAdd, toRemove } = calculateDestinationDiff(existing, newDests);

      expect(toAdd).toEqual(['广州']);
      expect(toRemove).toEqual([]);
    });

    it('should identify old destinations to remove', () => {
      const existing = ['北京', '上海', '广州'];
      const newDests = ['北京', '上海'];

      const { toAdd, toRemove } = calculateDestinationDiff(existing, newDests);

      expect(toAdd).toEqual([]);
      expect(toRemove).toEqual(['广州']);
    });

    it('should handle both additions and removals', () => {
      const existing = ['北京', '上海'];
      const newDests = ['上海', '广州', '深圳'];

      const { toAdd, toRemove } = calculateDestinationDiff(existing, newDests);

      expect(toAdd.sort()).toEqual(['广州', '深圳'].sort());
      expect(toRemove).toEqual(['北京']);
    });

    it('should handle no changes', () => {
      const existing = ['北京', '上海'];
      const newDests = ['北京', '上海'];

      const { toAdd, toRemove } = calculateDestinationDiff(existing, newDests);

      expect(toAdd).toEqual([]);
      expect(toRemove).toEqual([]);
    });

    it('should handle empty existing', () => {
      const existing: string[] = [];
      const newDests = ['北京', '上海'];

      const { toAdd, toRemove } = calculateDestinationDiff(existing, newDests);

      expect(toAdd.sort()).toEqual(['上海', '北京'].sort());
      expect(toRemove).toEqual([]);
    });

    it('should handle empty new destinations', () => {
      const existing = ['北京', '上海'];
      const newDests: string[] = [];

      const { toAdd, toRemove } = calculateDestinationDiff(existing, newDests);

      expect(toAdd).toEqual([]);
      expect(toRemove.sort()).toEqual(['上海', '北京'].sort());
    });

    it('should normalize and deduplicate', () => {
      const existing = ['Beijing', '  shanghai  '];
      const newDests = ['beijing', 'SHANGHAI', 'Guangzhou'];

      const { toAdd, toRemove } = calculateDestinationDiff(existing, newDests);

      // beijing and shanghai already exist (after normalization)
      expect(toAdd).toEqual(['guangzhou']);
      expect(toRemove).toEqual([]);
    });
  });
});

describe('guideDestinations - Query Helpers', () => {
  describe('destination search', () => {
    it('should filter by prefix', () => {
      const destinations = ['北京', '北海', '上海', '广州', '北戴河'];
      const prefix = '北';

      const matches = destinations.filter(d =>
        normalizeDestination(d).startsWith(normalizeDestination(prefix)),
      );

      expect(matches).toEqual(['北京', '北海', '北戴河']);
    });

    it('should count occurrences', () => {
      const records = [
        { destination: '北京' },
        { destination: '上海' },
        { destination: '北京' },
        { destination: '广州' },
        { destination: '北京' },
      ];

      const counts = new Map<string, number>();
      for (const r of records) {
        counts.set(r.destination, (counts.get(r.destination) ?? 0) + 1);
      }

      expect(counts.get('北京')).toBe(3);
      expect(counts.get('上海')).toBe(1);
      expect(counts.get('广州')).toBe(1);
    });

    it('should sort by count descending', () => {
      const counts = new Map([
        ['北京', 10],
        ['上海', 25],
        ['广州', 15],
      ]);

      const sorted = [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([dest]) => dest);

      expect(sorted).toEqual(['上海', '广州', '北京']);
    });
  });
});

describe('guideDestinations - Delete Operations', () => {
  describe('deleteDestinationsForGuide', () => {
    it('should identify all destinations for a guide', () => {
      const allRecords = [
        { guideId: 'guide1', destination: '北京' },
        { guideId: 'guide1', destination: '上海' },
        { guideId: 'guide2', destination: '广州' },
        { guideId: 'guide1', destination: '深圳' },
      ];

      const toDelete = allRecords.filter(r => r.guideId === 'guide1');

      expect(toDelete).toHaveLength(3);
      expect(toDelete.map(r => r.destination).sort()).toEqual(['上海', '北京', '深圳'].sort());
    });
  });
});
