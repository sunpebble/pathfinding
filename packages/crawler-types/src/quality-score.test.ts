import { describe, expect, it } from "vitest";
import { calculateQualityScoreUnified } from "./quality-score.js";

describe("calculateQualityScoreUnified", () => {
  describe("complete input", () => {
    it("should return high score for complete data", () => {
      const result = calculateQualityScoreUnified({
        title: "北京五日深度游完全攻略——故宫长城颐和园",
        content: "A".repeat(1000),
        authorName: "旅行达人",
        images: ["img1", "img2", "img3", "img4", "img5"],
        coverImage: "cover.jpg",
        views: 15000,
        likes: 200,
        saves: 80,
        comments: 30,
        destinations: ["北京"],
        tags: ["攻略", "自由行"],
      });
      expect(result.score).toBeGreaterThanOrEqual(0.9);
      expect(result.suggestions).toHaveLength(0);
    });
  });

  describe("title scoring", () => {
    it("should give full title score for >= 10 chars", () => {
      const result = calculateQualityScoreUnified({
        title: "这是一个足够长的标题名称",
        content: "A".repeat(500),
      });
      expect(result.breakdown.title).toBe(0.15);
    });

    it("should give partial title score for 5-9 chars", () => {
      const result = calculateQualityScoreUnified({
        title: "短标题测试",
        content: "A".repeat(500),
      });
      expect(result.breakdown.title).toBeGreaterThan(0);
      expect(result.breakdown.title).toBeLessThan(0.15);
    });

    it("should give 0 for missing title", () => {
      const result = calculateQualityScoreUnified({
        content: "A".repeat(500),
      });
      expect(result.breakdown.title).toBe(0);
      expect(result.suggestions).toContain("缺少标题");
    });
  });

  describe("content scoring", () => {
    it("should give full score for >= 1000 chars", () => {
      const result = calculateQualityScoreUnified({
        content: "A".repeat(1000),
      });
      expect(result.breakdown.content).toBe(0.35);
    });

    it("should give high score for >= 500 chars", () => {
      const result = calculateQualityScoreUnified({
        content: "A".repeat(500),
      });
      expect(result.breakdown.content).toBeCloseTo(0.35 * 0.85, 2);
    });

    it("should give medium score for >= 200 chars", () => {
      const result = calculateQualityScoreUnified({
        content: "A".repeat(200),
      });
      expect(result.breakdown.content).toBeCloseTo(0.35 * 0.6, 2);
    });

    it("should give low score for < 200 chars", () => {
      const result = calculateQualityScoreUnified({
        content: "A".repeat(100),
      });
      expect(result.breakdown.content).toBeCloseTo(0.35 * 0.3, 2);
    });

    it("should give 0 for empty content", () => {
      const result = calculateQualityScoreUnified({});
      expect(result.breakdown.content).toBe(0);
    });
  });

  describe("image scoring", () => {
    it("should give full score for 5+ images with cover", () => {
      const result = calculateQualityScoreUnified({
        images: ["1", "2", "3", "4", "5"],
        coverImage: "cover.jpg",
      });
      expect(result.breakdown.images).toBe(0.15);
    });

    it("should give partial score for 1 image", () => {
      const result = calculateQualityScoreUnified({
        images: ["1"],
      });
      expect(result.breakdown.images).toBeCloseTo(0.15 * 0.5, 2);
    });

    it("should give 0 for no images", () => {
      const result = calculateQualityScoreUnified({});
      expect(result.breakdown.images).toBe(0);
      expect(result.suggestions).toContain("缺少图片");
    });
  });

  describe("engagement scoring", () => {
    it("should give full score for 3+ engagement metrics", () => {
      const result = calculateQualityScoreUnified({
        views: 100,
        likes: 10,
        comments: 5,
      });
      expect(result.breakdown.engagement).toBe(0.15);
    });

    it("should give partial score for 1 metric", () => {
      const result = calculateQualityScoreUnified({
        views: 100,
      });
      expect(result.breakdown.engagement).toBeCloseTo(0.15 * 0.4, 2);
    });

    it("should give 0 for no engagement", () => {
      const result = calculateQualityScoreUnified({});
      expect(result.breakdown.engagement).toBe(0);
    });
  });

  describe("metadata scoring", () => {
    it("should give full score for destinations + tags", () => {
      const result = calculateQualityScoreUnified({
        destinations: ["北京"],
        tags: ["攻略"],
      });
      expect(result.breakdown.metadata).toBe(0.15);
    });

    it("should give partial score for just destinations", () => {
      const result = calculateQualityScoreUnified({
        destinations: ["北京"],
      });
      expect(result.breakdown.metadata).toBeCloseTo(0.15 * 0.5, 2);
    });

    it("should give 0 for no metadata", () => {
      const result = calculateQualityScoreUnified({});
      expect(result.breakdown.metadata).toBe(0);
    });
  });

  describe("edge cases", () => {
    it("should return 0 for completely empty input", () => {
      const result = calculateQualityScoreUnified({});
      expect(result.score).toBe(0);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it("should cap score at 1", () => {
      const result = calculateQualityScoreUnified({
        title: "A".repeat(100),
        content: "A".repeat(5000),
        authorName: "Author",
        images: Array.from({ length: 20 }, (_, i) => `img${i}`),
        coverImage: "cover.jpg",
        views: 100000,
        likes: 5000,
        saves: 2000,
        comments: 500,
        destinations: ["A", "B"],
        tags: ["x", "y"],
        rating: 5,
      });
      expect(result.score).toBeLessThanOrEqual(1);
    });

    it("should return a number between 0 and 1", () => {
      const cases = [
        {},
        { title: "test" },
        { content: "A".repeat(50) },
        { images: ["x"] },
      ];
      for (const input of cases) {
        const result = calculateQualityScoreUnified(input);
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
      }
    });
  });
});
