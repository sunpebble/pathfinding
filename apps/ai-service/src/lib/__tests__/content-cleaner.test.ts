/**
 * Tests for Content Cleaner Module
 * Tests the LLM-based content cleaning logic with mocked LLM responses
 */

import type { RawCrawlData } from '../content-cleaner.js';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { batchCleanContent, cleanContentWithLLM } from '../content-cleaner.js';
import { createLLM } from '../llm/index.js';

// Mock the LLM module before importing content-cleaner
vi.mock('../llm/index.js', () => ({
  createLLM: vi.fn(() => ({
    invoke: vi.fn(),
  })),
}));

vi.mock('../logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

describe('content Cleaner', () => {
  const mockInvoke = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (createLLM as ReturnType<typeof vi.fn>).mockReturnValue({
      invoke: mockInvoke,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('cleanContentWithLLM', () => {
    it('should return basic cleanup for very short content', async () => {
      const rawData: RawCrawlData = {
        title: 'Test',
        content: 'Short content',
        sourceUrl: 'https://example.com',
        platform: 'test',
      };

      const result = await cleanContentWithLLM(rawData);

      expect(result.title).toBe('Test');
      expect(result.content).toBe('Short content');
      expect(result.summary).toBe('');
      expect(result.hasAds).toBe(false);
      expect(result.originalLength).toBe(13);
      expect(result.cleanedLength).toBe(13);
      // LLM should not be called for short content
      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it('should process content with LLM for longer text', async () => {
      const longContent = '这是一篇关于杭州西湖的旅行攻略。'.repeat(10);
      const rawData: RawCrawlData = {
        title: '杭州西湖三日游 - 携程旅行',
        content: longContent,
        sourceUrl: 'https://example.com/guide',
        platform: 'ctrip',
      };

      mockInvoke.mockResolvedValue({
        content: JSON.stringify({
          title: '杭州西湖三日游',
          content: '清洗后的内容',
          summary: '杭州西湖旅行攻略摘要',
          hasAds: true,
        }),
      });

      const result = await cleanContentWithLLM(rawData);

      expect(result.title).toBe('杭州西湖三日游');
      expect(result.content).toBe('清洗后的内容');
      expect(result.summary).toBe('杭州西湖旅行攻略摘要');
      expect(result.hasAds).toBe(true);
      expect(mockInvoke).toHaveBeenCalledTimes(1);
    });

    it('should handle LLM response with extra text around JSON', async () => {
      const rawData: RawCrawlData = {
        title: 'Test Guide',
        content: 'A'.repeat(100),
        sourceUrl: 'https://example.com',
        platform: 'test',
      };

      mockInvoke.mockResolvedValue({
        content: `Here is the cleaned content:
        {"title": "Clean Title", "content": "Clean content here", "summary": "Summary", "hasAds": false}
        Done!`,
      });

      const result = await cleanContentWithLLM(rawData);

      expect(result.title).toBe('Clean Title');
      expect(result.content).toBe('Clean content here');
    });

    it('should fallback to original content when JSON parsing fails', async () => {
      const rawData: RawCrawlData = {
        title: 'Original Title',
        content: 'Original content that is long enough'.repeat(3),
        sourceUrl: 'https://example.com',
        platform: 'test',
      };

      mockInvoke.mockResolvedValue({
        content: 'Invalid response without JSON',
      });

      const result = await cleanContentWithLLM(rawData);

      expect(result.title).toBe('Original Title');
      expect(result.content).toBe(rawData.content.trim());
      expect(result.hasAds).toBe(false);
    });

    it('should handle LLM errors gracefully', async () => {
      const rawData: RawCrawlData = {
        title: 'Error Test',
        content: 'Content for error test'.repeat(5),
        sourceUrl: 'https://example.com',
        platform: 'test',
      };

      mockInvoke.mockRejectedValue(new Error('LLM API Error'));

      const result = await cleanContentWithLLM(rawData);

      expect(result.title).toBe('Error Test');
      expect(result.content).toBe(rawData.content.trim());
      expect(result.hasAds).toBe(false);
    });

    it('should truncate very long content before processing', async () => {
      const veryLongContent = 'A'.repeat(20000);
      const rawData: RawCrawlData = {
        title: 'Long Content Test',
        content: veryLongContent,
        sourceUrl: 'https://example.com',
        platform: 'test',
      };

      mockInvoke.mockResolvedValue({
        content: JSON.stringify({
          title: 'Long Content Test',
          content: 'Processed',
          summary: 'Summary',
          hasAds: false,
        }),
      });

      await cleanContentWithLLM(rawData);

      // Check that the prompt was truncated
      const callArg = mockInvoke.mock.calls[0][0];
      expect(callArg).toContain('[内容已截断...]');
    });

    it('should handle missing fields in LLM response', async () => {
      const rawData: RawCrawlData = {
        title: 'Partial Response Test',
        content: 'Some content here'.repeat(5),
        sourceUrl: 'https://example.com',
        platform: 'test',
      };

      mockInvoke.mockResolvedValue({
        content: JSON.stringify({
          // Missing title, content, summary
          hasAds: true,
        }),
      });

      const result = await cleanContentWithLLM(rawData);

      // Should fallback to original values
      expect(result.title).toBe('Partial Response Test');
      expect(result.content).toBe(rawData.content.trim());
      expect(result.summary).toBe('');
    });
  });

  describe('batchCleanContent', () => {
    it('should process multiple items sequentially', async () => {
      const items: RawCrawlData[] = [
        {
          title: 'Guide 1',
          content: 'Content 1'.repeat(10),
          sourceUrl: 'https://example.com/1',
          platform: 'test',
        },
        {
          title: 'Guide 2',
          content: 'Content 2'.repeat(10),
          sourceUrl: 'https://example.com/2',
          platform: 'test',
        },
      ];

      mockInvoke
        .mockResolvedValueOnce({
          content: JSON.stringify({
            title: 'Cleaned 1',
            content: 'Clean 1',
            summary: 'Sum 1',
            hasAds: false,
          }),
        })
        .mockResolvedValueOnce({
          content: JSON.stringify({
            title: 'Cleaned 2',
            content: 'Clean 2',
            summary: 'Sum 2',
            hasAds: true,
          }),
        });

      const results = await batchCleanContent(items);

      expect(results).toHaveLength(2);
      expect(results[0].title).toBe('Cleaned 1');
      expect(results[1].title).toBe('Cleaned 2');
      expect(mockInvoke).toHaveBeenCalledTimes(2);
    });

    it('should handle errors for individual items without failing batch', async () => {
      const items: RawCrawlData[] = [
        {
          title: 'Good Item',
          content: 'Good content'.repeat(10),
          sourceUrl: 'https://example.com/good',
          platform: 'test',
        },
        {
          title: 'Bad Item',
          content: 'Bad content'.repeat(10),
          sourceUrl: 'https://example.com/bad',
          platform: 'test',
        },
      ];

      mockInvoke
        .mockResolvedValueOnce({
          content: JSON.stringify({
            title: 'Cleaned Good',
            content: 'Cleaned',
            summary: 'Sum',
            hasAds: false,
          }),
        })
        .mockRejectedValueOnce(new Error('API Error'));

      const results = await batchCleanContent(items);

      expect(results).toHaveLength(2);
      expect(results[0].title).toBe('Cleaned Good');
      // Failed item should have original content
      expect(results[1].title).toBe('Bad Item');
      expect(results[1].content).toBe(items[1].content);
    });

    it('should return empty array for empty input', async () => {
      const results = await batchCleanContent([]);
      expect(results).toEqual([]);
      expect(mockInvoke).not.toHaveBeenCalled();
    });
  });

  describe('cleanedContent structure', () => {
    it('should include all required fields', async () => {
      const rawData: RawCrawlData = {
        title: 'Structure Test',
        content: 'Test content for structure validation'.repeat(5),
        sourceUrl: 'https://example.com',
        platform: 'xiaohongshu',
      };

      mockInvoke.mockResolvedValue({
        content: JSON.stringify({
          title: 'Clean Title',
          content: 'Clean content',
          summary: 'Summary text',
          hasAds: true,
        }),
      });

      const result = await cleanContentWithLLM(rawData);

      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('hasAds');
      expect(result).toHaveProperty('originalLength');
      expect(result).toHaveProperty('cleanedLength');
      expect(typeof result.originalLength).toBe('number');
      expect(typeof result.cleanedLength).toBe('number');
    });
  });
});
