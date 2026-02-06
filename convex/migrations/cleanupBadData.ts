/**
 * 清理无法在 App 中完美展示的游记数据
 *
 * 完美展示标准：
 * 1. 有标题（非空）
 * 2. 有封面图（coverImageUrl 或 imageUrls 非空）
 * 3. 内容不太短（>= 200 字）
 * 4. 已完成 AI 处理（aiProcessedAt 存在）
 * 5. AI 行程数据有效（aiDays 存在且至少有一个 POI 有合法坐标）
 *
 * 运行方式：
 *   npx convex run migrations/cleanupBadData:analyze     - 分析数据质量
 *   npx convex run migrations/cleanupBadData:cleanup      - 删除不合格数据（每批 20 条）
 */

import { v } from 'convex/values';
import { mutation, query } from '../_generated/server';
import { deleteGuideFromAggregates } from '../guideAggregates';
import { deleteDestinationsForGuide } from '../guideDestinations';

const MIN_CONTENT_LENGTH = 200;

/**
 * 检查坐标是否有效
 */
function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    lat !== 0
    && lng !== 0
    && lat >= -90
    && lat <= 90
    && lng >= -180
    && lng <= 180
  );
}

/**
 * 判断游记是否可以在 App 中完美展示
 */
function isDisplayable(guide: {
  title?: string;
  content?: string;
  coverImageUrl?: string;
  imageUrls?: string[];
  aiProcessedAt?: number;
  aiDays?: Array<{
    dayNumber: number;
    pois: Array<{ latitude: number; longitude: number; name: string }>;
  }>;
}): { displayable: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // 1. 标题检查
  if (!guide.title || guide.title.trim() === '') {
    reasons.push('no_title');
  }

  // 2. 封面图检查
  if (!guide.coverImageUrl && (!guide.imageUrls || guide.imageUrls.length === 0)) {
    reasons.push('no_cover_image');
  }

  // 3. 内容长度检查
  if (!guide.content || guide.content.length < MIN_CONTENT_LENGTH) {
    reasons.push('short_content');
  }

  // 4. AI 处理检查
  if (!guide.aiProcessedAt) {
    reasons.push('no_ai_data');
  }

  // 5. AI 行程有效性检查
  if (!guide.aiDays || guide.aiDays.length === 0) {
    reasons.push('no_ai_days');
  }
  else {
    // 检查是否至少有一个有效的 POI（有名称和合法坐标）
    const hasValidPoi = guide.aiDays.some(day =>
      day.pois.some(poi =>
        poi.name && poi.name.trim() !== '' && isValidCoordinate(poi.latitude, poi.longitude),
      ),
    );
    if (!hasValidPoi) {
      reasons.push('no_valid_pois');
    }
  }

  return {
    displayable: reasons.length === 0,
    reasons,
  };
}

/**
 * 分析数据质量（带分页）
 */
export const analyze = query({
  args: {
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query('travelGuides')
      .paginate({
        numItems: 100,
        cursor: args.cursor ? (args.cursor as never) : null,
      });

    let displayable = 0;
    let notDisplayable = 0;
    const reasonCounts: Record<string, number> = {};
    const badGuides: Array<{
      _id: string;
      title?: string;
      sourcePlatform: string;
      reasons: string[];
    }> = [];

    for (const guide of result.page) {
      const check = isDisplayable(guide);
      if (check.displayable) {
        displayable++;
      }
      else {
        notDisplayable++;
        for (const reason of check.reasons) {
          reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
        }
        badGuides.push({
          _id: guide._id,
          title: guide.title,
          sourcePlatform: guide.sourcePlatform,
          reasons: check.reasons,
        });
      }
    }

    return {
      batchSize: result.page.length,
      displayable,
      notDisplayable,
      reasonCounts,
      badGuides: badGuides.slice(0, 20), // 只返回前 20 条样本
      isDone: result.isDone,
      nextCursor: result.isDone ? undefined : result.continueCursor,
    };
  },
});

/**
 * 删除不合格的游记数据（带分页）
 */
export const cleanup = mutation({
  args: {
    cursor: v.optional(v.string()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? false;

    const result = await ctx.db
      .query('travelGuides')
      .paginate({
        numItems: 50,
        cursor: args.cursor ? (args.cursor as never) : null,
      });

    let deleted = 0;
    let kept = 0;
    const deletedGuides: Array<{ _id: string; title?: string; reasons: string[] }> = [];

    for (const guide of result.page) {
      const check = isDisplayable(guide);

      if (!check.displayable) {
        if (!dryRun) {
          // 清理关联数据
          const recs = await ctx.db
            .query('guideRecommendations')
            .filter(q => q.eq(q.field('guideId'), guide._id))
            .collect();
          for (const rec of recs) {
            await ctx.db.delete(rec._id);
          }

          // 清理关联目的地
          try {
            await deleteDestinationsForGuide(ctx, guide._id);
          }
          catch {
            // 忽略目的地清理错误
          }

          // 更新聚合数据（可能因数据不一致而失败）
          try {
            await deleteGuideFromAggregates(ctx, guide);
          }
          catch {
            // 忽略聚合更新错误（数据不一致时）
          }

          // 清理 AI 数据表
          const aiDataRecords = await ctx.db
            .query('travelGuideAiData')
            .withIndex('by_guide', q => q.eq('guideId', guide._id))
            .collect();
          for (const record of aiDataRecords) {
            await ctx.db.delete(record._id);
          }

          // 删除游记
          await ctx.db.delete(guide._id);
        }

        deletedGuides.push({
          _id: guide._id,
          title: guide.title,
          reasons: check.reasons,
        });
        deleted++;
      }
      else {
        kept++;
      }
    }

    return {
      dryRun,
      batchSize: result.page.length,
      deleted,
      kept,
      deletedGuides: deletedGuides.slice(0, 20),
      isDone: result.isDone,
      nextCursor: result.isDone ? undefined : result.continueCursor,
      message: dryRun
        ? `[DRY RUN] Would delete ${deleted}, keep ${kept}`
        : `Deleted ${deleted}, kept ${kept}`,
    };
  },
});
