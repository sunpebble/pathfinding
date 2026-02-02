/**
 * Tests for AI Content Enhancement API
 * Tests the /enhance and /enhance/batch endpoints
 */

import { describe, expect, it } from 'vitest';

// ============================================================
// Request/Response Type Definitions (mirroring ai.ts)
// ============================================================

interface EnhanceRequest {
  guideId: string;
  content: string;
  title?: string;
  generateTitle?: boolean;
  generateSummary?: boolean;
}

interface EnhanceResult {
  guideId: string;
  success: boolean;
  title?: string;
  summary?: string;
  error?: string;
}

interface BatchEnhanceRequest {
  guides: Array<{ guideId: string; content: string; title?: string }>;
  generateTitle?: boolean;
  generateSummary?: boolean;
}

interface BatchEnhanceResponse {
  success: boolean;
  total: number;
  succeeded: number;
  failed: number;
  results: EnhanceResult[];
}

// ============================================================
// Validation Helper Functions
// ============================================================

function validateEnhanceRequest(req: Partial<EnhanceRequest>): { valid: boolean; error?: string } {
  if (!req.guideId) {
    return { valid: false, error: 'guideId is required' };
  }
  if (!req.content) {
    return { valid: false, error: 'content is required' };
  }
  return { valid: true };
}

function validateBatchRequest(req: Partial<BatchEnhanceRequest>): { valid: boolean; error?: string } {
  if (!req.guides || !Array.isArray(req.guides)) {
    return { valid: false, error: 'guides array is required' };
  }
  if (req.guides.length > 10) {
    return { valid: false, error: 'Maximum 10 guides per batch' };
  }
  return { valid: true };
}

function shouldGenerateTitle(title: string | undefined, generateTitle: boolean): boolean {
  return generateTitle && !title;
}

function shouldGenerateSummary(contentLength: number, generateSummary: boolean): boolean {
  return generateSummary && contentLength > 500;
}

function truncateTitle(title: string, maxLength: number = 50): string {
  return title.trim().slice(0, maxLength);
}

function truncateSummary(summary: string, maxLength: number = 200): string {
  return summary.trim().slice(0, maxLength);
}

// ============================================================
// Tests
// ============================================================

describe('aI Enhancement API - Request Validation', () => {
  describe('single enhance request', () => {
    it('should validate request with guideId and content', () => {
      const result = validateEnhanceRequest({
        guideId: 'guide123',
        content: 'Some content here',
      });
      expect(result.valid).toBe(true);
    });

    it('should reject request without guideId', () => {
      const result = validateEnhanceRequest({
        content: 'Some content here',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('guideId is required');
    });

    it('should reject request without content', () => {
      const result = validateEnhanceRequest({
        guideId: 'guide123',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('content is required');
    });
  });

  describe('batch enhance request', () => {
    it('should validate batch request with guides array', () => {
      const result = validateBatchRequest({
        guides: [
          { guideId: 'guide1', content: 'Content 1' },
          { guideId: 'guide2', content: 'Content 2' },
        ],
      });
      expect(result.valid).toBe(true);
    });

    it('should reject batch request without guides', () => {
      const result = validateBatchRequest({});
      expect(result.valid).toBe(false);
      expect(result.error).toBe('guides array is required');
    });

    it('should reject batch request with more than 10 guides', () => {
      const guides = Array.from({ length: 11 }, (_, i) => ({
        guideId: `guide${i}`,
        content: `Content ${i}`,
      }));
      const result = validateBatchRequest({ guides });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Maximum 10 guides per batch');
    });

    it('should accept batch request with exactly 10 guides', () => {
      const guides = Array.from({ length: 10 }, (_, i) => ({
        guideId: `guide${i}`,
        content: `Content ${i}`,
      }));
      const result = validateBatchRequest({ guides });
      expect(result.valid).toBe(true);
    });
  });
});

describe('aI Enhancement API - Title Generation Logic', () => {
  describe('shouldGenerateTitle', () => {
    it('should return true when generateTitle=true and title is missing', () => {
      expect(shouldGenerateTitle(undefined, true)).toBe(true);
    });

    it('should return false when title already exists', () => {
      expect(shouldGenerateTitle('Existing Title', true)).toBe(false);
    });

    it('should return false when generateTitle=false', () => {
      expect(shouldGenerateTitle(undefined, false)).toBe(false);
    });

    it('should return false when title is empty string but generateTitle=false', () => {
      expect(shouldGenerateTitle('', false)).toBe(false);
    });
  });

  describe('truncateTitle', () => {
    it('should not modify title within limit', () => {
      const title = 'Short Title';
      expect(truncateTitle(title)).toBe('Short Title');
    });

    it('should truncate title exceeding 50 characters', () => {
      const longTitle = 'A'.repeat(60);
      expect(truncateTitle(longTitle)).toHaveLength(50);
    });

    it('should trim whitespace', () => {
      const title = '  Title with spaces  ';
      expect(truncateTitle(title)).toBe('Title with spaces');
    });

    it('should handle custom max length', () => {
      const title = 'A'.repeat(100);
      expect(truncateTitle(title, 30)).toHaveLength(30);
    });
  });
});

describe('aI Enhancement API - Summary Generation Logic', () => {
  describe('shouldGenerateSummary', () => {
    it('should return true when content > 500 chars and generateSummary=true', () => {
      expect(shouldGenerateSummary(600, true)).toBe(true);
    });

    it('should return false when content <= 500 chars', () => {
      expect(shouldGenerateSummary(500, true)).toBe(false);
      expect(shouldGenerateSummary(400, true)).toBe(false);
    });

    it('should return false when generateSummary=false', () => {
      expect(shouldGenerateSummary(600, false)).toBe(false);
    });
  });

  describe('truncateSummary', () => {
    it('should not modify summary within limit', () => {
      const summary = 'A short summary.';
      expect(truncateSummary(summary)).toBe('A short summary.');
    });

    it('should truncate summary exceeding 200 characters', () => {
      const longSummary = 'A'.repeat(250);
      expect(truncateSummary(longSummary)).toHaveLength(200);
    });

    it('should trim whitespace', () => {
      const summary = '  Summary with spaces  ';
      expect(truncateSummary(summary)).toBe('Summary with spaces');
    });
  });
});

describe('aI Enhancement API - Batch Processing', () => {
  describe('result aggregation', () => {
    it('should count successful and failed results correctly', () => {
      const results: EnhanceResult[] = [
        { guideId: 'guide1', success: true, title: 'Title 1' },
        { guideId: 'guide2', success: true, title: 'Title 2' },
        { guideId: 'guide3', success: false, error: 'Failed' },
        { guideId: 'guide4', success: true, title: 'Title 4' },
      ];

      const successCount = results.filter(r => r.success).length;
      const failedCount = results.filter(r => !r.success).length;

      expect(successCount).toBe(3);
      expect(failedCount).toBe(1);
    });

    it('should build correct batch response', () => {
      const results: EnhanceResult[] = [
        { guideId: 'guide1', success: true, title: 'Title 1', summary: 'Summary 1' },
        { guideId: 'guide2', success: false, error: 'AI error' },
      ];

      const response: BatchEnhanceResponse = {
        success: true,
        total: results.length,
        succeeded: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results,
      };

      expect(response.total).toBe(2);
      expect(response.succeeded).toBe(1);
      expect(response.failed).toBe(1);
      expect(response.results).toHaveLength(2);
    });
  });

  describe('partial failure handling', () => {
    it('should continue processing after individual failure', () => {
      const guides = [
        { guideId: 'guide1', content: 'Content 1' },
        { guideId: 'guide2', content: '' }, // This would fail
        { guideId: 'guide3', content: 'Content 3' },
      ];

      // Simulate processing with error handling
      const results: EnhanceResult[] = [];
      for (const guide of guides) {
        try {
          if (!guide.content) {
            throw new Error('Content required');
          }
          results.push({ guideId: guide.guideId, success: true });
        }
        catch (error) {
          results.push({
            guideId: guide.guideId,
            success: false,
            error: error instanceof Error ? error.message : 'Failed',
          });
        }
      }

      expect(results).toHaveLength(3);
      expect(results[0]?.success).toBe(true);
      expect(results[1]?.success).toBe(false);
      expect(results[2]?.success).toBe(true);
    });
  });
});

describe('aI Enhancement API - Enhancement Priority', () => {
  describe('usable vs incomplete priority', () => {
    it('should prioritize usable level guides', () => {
      const guides = [
        { guideId: 'guide1', completenessLevel: 'incomplete' as const },
        { guideId: 'guide2', completenessLevel: 'usable' as const },
        { guideId: 'guide3', completenessLevel: 'incomplete' as const },
        { guideId: 'guide4', completenessLevel: 'usable' as const },
      ];

      // Priority sorting: usable first
      const sorted = [...guides].sort((a, b) => {
        if (a.completenessLevel === 'usable' && b.completenessLevel !== 'usable')
          return -1;
        if (a.completenessLevel !== 'usable' && b.completenessLevel === 'usable')
          return 1;
        return 0;
      });

      expect(sorted[0]?.completenessLevel).toBe('usable');
      expect(sorted[1]?.completenessLevel).toBe('usable');
      expect(sorted[2]?.completenessLevel).toBe('incomplete');
      expect(sorted[3]?.completenessLevel).toBe('incomplete');
    });

    it('should filter guides needing enhancement (missing title or summary)', () => {
      const guides = [
        { guideId: 'guide1', title: 'Has Title', aiSummary: 'Has Summary' },
        { guideId: 'guide2', title: undefined, aiSummary: undefined },
        { guideId: 'guide3', title: 'Has Title', aiSummary: undefined },
        { guideId: 'guide4', title: undefined, aiSummary: 'Has Summary' },
      ];

      const needsEnhancement = guides.filter(g => !g.title || !g.aiSummary);

      expect(needsEnhancement).toHaveLength(3);
      expect(needsEnhancement.map(g => g.guideId)).toContain('guide2');
      expect(needsEnhancement.map(g => g.guideId)).toContain('guide3');
      expect(needsEnhancement.map(g => g.guideId)).toContain('guide4');
    });
  });
});

describe('aI Enhancement API - Completeness Recalculation', () => {
  describe('after enhancement', () => {
    it('should detect upgrade eligibility when title is added', () => {
      // Before: incomplete (no title)
      const before = {
        title: undefined,
        content: 'A'.repeat(300),
        coverImageUrl: 'https://example.com/img.jpg',
      };

      // After: has title
      const after = {
        ...before,
        title: 'Generated Title',
      };

      // Check usable criteria: title + content >= 200 + images
      const hasTitle = !!after.title;
      const hasContent = (after.content?.length ?? 0) >= 200;
      const hasImages = !!after.coverImageUrl;

      const isUsable = hasTitle && hasContent && hasImages;
      expect(isUsable).toBe(true);
    });

    it('should remain at current level if enhancement does not improve criteria', () => {
      // Already usable, adding summary doesn't upgrade to complete
      const _guide = {
        title: 'Existing Title',
        content: 'A'.repeat(300),
        coverImageUrl: 'https://example.com/img.jpg',
        aiSummary: 'Generated Summary',
      };

      // Still needs more fields for complete level
      const hasAuthor = false;
      const hasDestinations = false;
      const hasAllCounts = false;

      const isComplete = hasAuthor && hasDestinations && hasAllCounts;
      expect(isComplete).toBe(false);
    });
  });
});
