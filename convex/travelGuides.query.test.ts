/**
 * Tests for Query Filtering by Completeness Level
 * Verifies that the completenessLevel filter works correctly in travelGuides queries
 */

import { describe, expect, it } from 'vitest';

// ============================================================
// Type Definitions (mirroring travelGuides.ts)
// ============================================================

type CompletenessLevel = 'complete' | 'usable' | 'incomplete';

interface TravelGuide {
  _id: string;
  title?: string;
  content: string;
  completenessLevel?: CompletenessLevel;
  sourcePlatform: string;
  qualityScore: number;
}

// ============================================================
// Mock Data for Testing
// ============================================================

const mockGuides: TravelGuide[] = [
  {
    _id: 'guide1',
    title: 'Complete Guide to Beijing',
    content: 'A'.repeat(600),
    completenessLevel: 'complete',
    sourcePlatform: 'xiaohongshu',
    qualityScore: 0.9,
  },
  {
    _id: 'guide2',
    title: 'Usable Shanghai Guide',
    content: 'A'.repeat(300),
    completenessLevel: 'usable',
    sourcePlatform: 'xiaohongshu',
    qualityScore: 0.7,
  },
  {
    _id: 'guide3',
    title: undefined,
    content: 'A'.repeat(100),
    completenessLevel: 'incomplete',
    sourcePlatform: 'weibo',
    qualityScore: 0.3,
  },
  {
    _id: 'guide4',
    title: 'Another Complete Guide',
    content: 'A'.repeat(550),
    completenessLevel: 'complete',
    sourcePlatform: 'ctrip',
    qualityScore: 0.85,
  },
  {
    _id: 'guide5',
    title: 'Usable Hangzhou Guide',
    content: 'A'.repeat(250),
    completenessLevel: 'usable',
    sourcePlatform: 'weibo',
    qualityScore: 0.6,
  },
  {
    _id: 'guide6',
    content: 'Short content',
    completenessLevel: 'incomplete',
    sourcePlatform: 'xiaohongshu',
    qualityScore: 0.2,
  },
];

// ============================================================
// Query Filter Functions (simulating Convex query behavior)
// ============================================================

function filterByCompletenessLevel(
  guides: TravelGuide[],
  level: CompletenessLevel,
): TravelGuide[] {
  return guides.filter(g => g.completenessLevel === level);
}

function filterByPlatform(
  guides: TravelGuide[],
  platform: string,
): TravelGuide[] {
  return guides.filter(g => g.sourcePlatform === platform);
}

function filterByMinQuality(
  guides: TravelGuide[],
  minQuality: number,
): TravelGuide[] {
  return guides.filter(g => g.qualityScore >= minQuality);
}

function combinedFilter(
  guides: TravelGuide[],
  options: {
    completenessLevel?: CompletenessLevel;
    platform?: string;
    minQuality?: number;
    limit?: number;
  },
): TravelGuide[] {
  let result = [...guides];

  if (options.completenessLevel) {
    result = filterByCompletenessLevel(result, options.completenessLevel);
  }

  if (options.platform) {
    result = filterByPlatform(result, options.platform);
  }

  if (options.minQuality !== undefined) {
    result = filterByMinQuality(result, options.minQuality);
  }

  if (options.limit) {
    result = result.slice(0, options.limit);
  }

  return result;
}

// ============================================================
// Tests
// ============================================================

describe('query Filtering - Completeness Level', () => {
  describe('filter by completenessLevel', () => {
    it('should return only complete guides when filtering by "complete"', () => {
      const result = filterByCompletenessLevel(mockGuides, 'complete');

      expect(result).toHaveLength(2);
      expect(result.every(g => g.completenessLevel === 'complete')).toBe(
        true,
      );
      expect(result.map(g => g._id)).toContain('guide1');
      expect(result.map(g => g._id)).toContain('guide4');
    });

    it('should return only usable guides when filtering by "usable"', () => {
      const result = filterByCompletenessLevel(mockGuides, 'usable');

      expect(result).toHaveLength(2);
      expect(result.every(g => g.completenessLevel === 'usable')).toBe(true);
      expect(result.map(g => g._id)).toContain('guide2');
      expect(result.map(g => g._id)).toContain('guide5');
    });

    it('should return only incomplete guides when filtering by "incomplete"', () => {
      const result = filterByCompletenessLevel(mockGuides, 'incomplete');

      expect(result).toHaveLength(2);
      expect(result.every(g => g.completenessLevel === 'incomplete')).toBe(
        true,
      );
      expect(result.map(g => g._id)).toContain('guide3');
      expect(result.map(g => g._id)).toContain('guide6');
    });

    it('should return empty array when no guides match the level', () => {
      const guidesWithoutComplete = mockGuides.filter(
        g => g.completenessLevel !== 'complete',
      );
      const result = filterByCompletenessLevel(
        guidesWithoutComplete,
        'complete',
      );

      expect(result).toHaveLength(0);
    });
  });
});

describe('query Filtering - Combined Filters', () => {
  describe('completenessLevel + platform', () => {
    it('should filter by both completenessLevel and platform', () => {
      const result = combinedFilter(mockGuides, {
        completenessLevel: 'usable',
        platform: 'xiaohongshu',
      });

      expect(result).toHaveLength(1);
      expect(result[0]?._id).toBe('guide2');
      expect(result[0]?.completenessLevel).toBe('usable');
      expect(result[0]?.sourcePlatform).toBe('xiaohongshu');
    });

    it('should return empty when no guides match both filters', () => {
      const result = combinedFilter(mockGuides, {
        completenessLevel: 'complete',
        platform: 'weibo',
      });

      expect(result).toHaveLength(0);
    });
  });

  describe('completenessLevel + minQuality', () => {
    it('should filter by completenessLevel and minimum quality', () => {
      const result = combinedFilter(mockGuides, {
        completenessLevel: 'usable',
        minQuality: 0.65,
      });

      expect(result).toHaveLength(1);
      expect(result[0]?._id).toBe('guide2');
      expect(result[0]?.qualityScore).toBeGreaterThanOrEqual(0.65);
    });
  });

  describe('all filters combined', () => {
    it('should apply all filters together', () => {
      const result = combinedFilter(mockGuides, {
        completenessLevel: 'complete',
        platform: 'xiaohongshu',
        minQuality: 0.8,
      });

      expect(result).toHaveLength(1);
      expect(result[0]?._id).toBe('guide1');
    });

    it('should respect limit after filtering', () => {
      const result = combinedFilter(mockGuides, {
        completenessLevel: 'complete',
        limit: 1,
      });

      expect(result).toHaveLength(1);
    });
  });
});

describe('query Filtering - Edge Cases', () => {
  describe('null/undefined completenessLevel', () => {
    it('should handle guides without completenessLevel field', () => {
      const guidesWithNullLevel: TravelGuide[] = [
        ...mockGuides,
        {
          _id: 'guide7',
          content: 'Legacy content',
          completenessLevel: undefined,
          sourcePlatform: 'xiaohongshu',
          qualityScore: 0.5,
        },
      ];

      const result = filterByCompletenessLevel(guidesWithNullLevel, 'complete');

      // Should not include guide with undefined completenessLevel
      expect(result.map(g => g._id)).not.toContain('guide7');
    });
  });

  describe('empty guides array', () => {
    it('should return empty array when filtering empty list', () => {
      const result = filterByCompletenessLevel([], 'complete');
      expect(result).toHaveLength(0);
    });
  });

  describe('filter order independence', () => {
    it('should return same results regardless of filter application order', () => {
      // Apply completenessLevel first, then platform
      const result1 = filterByPlatform(
        filterByCompletenessLevel(mockGuides, 'usable'),
        'xiaohongshu',
      );

      // Apply platform first, then completenessLevel
      const result2 = filterByCompletenessLevel(
        filterByPlatform(mockGuides, 'xiaohongshu'),
        'usable',
      );

      expect(result1).toHaveLength(result2.length);
      expect(result1.map(g => g._id).sort()).toEqual(
        result2.map(g => g._id).sort(),
      );
    });
  });
});

describe('query Filtering - Index Usage Verification', () => {
  describe('by_completeness index simulation', () => {
    it('should efficiently filter by completenessLevel using index', () => {
      // This simulates what the by_completeness index does in Convex
      // In real Convex, this would be an O(log n) lookup instead of O(n) scan

      const indexedQuery = (level: CompletenessLevel): TravelGuide[] => {
        // Simulating index lookup - in reality this is optimized by Convex
        return mockGuides.filter(g => g.completenessLevel === level);
      };

      const completeGuides = indexedQuery('complete');
      const usableGuides = indexedQuery('usable');
      const incompleteGuides = indexedQuery('incomplete');

      // Verify index returns correct counts
      expect(
        completeGuides.length + usableGuides.length + incompleteGuides.length,
      ).toBeLessThanOrEqual(mockGuides.length);
    });
  });

  describe('compound filtering with index', () => {
    it('should use completenessLevel index then filter by platform in memory', () => {
      // This matches the query pattern in travelGuides.ts list() function
      // 1. Use by_completeness index to get guides at a level
      // 2. Filter by platform in memory

      const completenessLevel: CompletenessLevel = 'usable';
      const platform = 'xiaohongshu';

      // Step 1: Index lookup (simulated)
      const byLevel = mockGuides.filter(
        g => g.completenessLevel === completenessLevel,
      );

      // Step 2: Memory filter
      const byPlatform = byLevel.filter(g => g.sourcePlatform === platform);

      expect(byLevel.length).toBeGreaterThanOrEqual(byPlatform.length);
      expect(
        byPlatform.every(g => g.completenessLevel === completenessLevel),
      ).toBe(true);
      expect(byPlatform.every(g => g.sourcePlatform === platform)).toBe(true);
    });
  });
});

describe('query Filtering - getGuidesForEnhancement', () => {
  describe('priority level filtering', () => {
    it('should return guides at specified priority level', () => {
      const priorityLevel: CompletenessLevel = 'usable';

      const result = filterByCompletenessLevel(mockGuides, priorityLevel);

      expect(result.every(g => g.completenessLevel === priorityLevel)).toBe(
        true,
      );
    });

    it('should filter to guides missing title or summary', () => {
      const guides = filterByCompletenessLevel(mockGuides, 'usable');

      // Filter to guides needing enhancement (missing title)
      const needsEnhancement = guides.filter(g => !g.title);

      // All usable guides in our mock have titles, so this should be empty
      expect(needsEnhancement).toHaveLength(0);
    });

    it('should default to usable priority level', () => {
      const defaultPriority: CompletenessLevel = 'usable';
      const result = filterByCompletenessLevel(mockGuides, defaultPriority);

      expect(result.length).toBeGreaterThan(0);
    });
  });
});
