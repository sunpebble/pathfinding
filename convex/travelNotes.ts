import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Travel Notes - 旅行游记相关的查询和变更
 * 用户发布图文游记，支持点赞、评论、标签等功能
 */

const visibilityValidator = v.union(
  v.literal("private"),
  v.literal("public"),
  v.literal("followers"),
);

/**
 * 权限检查辅助函数
 */

// 检查用户是否有编辑权限（只有作者可以编辑）
async function checkEditPermission(
  ctx: QueryCtx | MutationCtx,
  noteId: Id<"travelNotes">,
  userId: string,
): Promise<boolean> {
  const note = await ctx.db.get(noteId);
  if (!note) {
    throw new Error("Travel note not found");
  }

  if (note.authorId !== userId) {
    throw new Error("You do not have permission to edit this travel note");
  }

  return true;
}

// 检查游记是否对用户可见
async function _checkReadPermission(
  ctx: QueryCtx | MutationCtx,
  noteId: Id<"travelNotes">,
  userId?: string,
): Promise<boolean> {
  const note = await ctx.db.get(noteId);
  if (!note) {
    throw new Error("Travel note not found");
  }

  // 作者总是可以查看
  if (userId && note.authorId === userId) {
    return true;
  }

  // 公开的游记任何人都可以看
  if (note.visibility === "public") {
    return true;
  }

  // 私密游记只有作者可以看
  if (note.visibility === "private") {
    throw new Error("This travel note is private");
  }

  // 关注者可见需要检查关注关系
  if (note.visibility === "followers" && userId) {
    const following = await ctx.db
      .query("userFollows")
      .withIndex("by_follower_following", (q) =>
        q.eq("followerId", userId).eq("followingId", note.authorId),
      )
      .first();

    if (following) {
      return true;
    }
  }

  throw new Error("You do not have permission to view this travel note");
}

// 列出用户的游记
export const listByUser = query({
  args: {
    userId: v.string(),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
    visibility: v.optional(visibilityValidator),
  },
  handler: async (ctx, args) => {
    const page = args.page ?? 1;
    const pageSize = args.pageSize ?? 10;
    const offset = (page - 1) * pageSize;

    let notes = await ctx.db
      .query("travelNotes")
      .withIndex("by_author", (q) => q.eq("authorId", args.userId))
      .order("desc")
      .collect();

    // 过滤可见性
    if (args.visibility) {
      notes = notes.filter((n) => n.visibility === args.visibility);
    }

    const total = notes.length;
    const data = notes.slice(offset, offset + pageSize);

    // 获取标签和图片数量
    const enriched = await Promise.all(
      data.map(async (note) => {
        const images = await ctx.db
          .query("noteImages")
          .withIndex("by_note", (q) => q.eq("noteId", note._id))
          .collect();

        const tags = await ctx.db
          .query("noteTags")
          .withIndex("by_note", (q) => q.eq("noteId", note._id))
          .collect();

        // 获取作者信息
        const profile = await ctx.db
          .query("profiles")
          .filter((q) => q.eq(q.field("email"), note.authorId))
          .first();

        return {
          ...note,
          imageCount: images.length,
          coverImage: images.find((i) => i.isCover)?.url ?? images[0]?.url,
          tags: tags.map((t) => t.tag),
          authorName: profile?.displayName,
          authorAvatar: profile?.avatarUrl,
        };
      }),
    );

    return { data: enriched, total };
  },
});

// 列出公开的游记（社区发现）
export const listPublic = query({
  args: {
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
    tag: v.optional(v.string()),
    sortBy: v.optional(
      v.union(v.literal("latest"), v.literal("popular"), v.literal("trending")),
    ),
  },
  handler: async (ctx, args) => {
    const page = args.page ?? 1;
    const pageSize = args.pageSize ?? 20;
    const offset = (page - 1) * pageSize;
    const sortBy = args.sortBy ?? "latest";

    let notes = await ctx.db
      .query("travelNotes")
      .withIndex("by_visibility", (q) => q.eq("visibility", "public"))
      .order("desc")
      .collect();

    // 如果有标签过滤
    if (args.tag) {
      const taggedNoteIds = new Set<string>();
      const tagEntries = await ctx.db
        .query("noteTags")
        .withIndex("by_tag", (q) => q.eq("tag", args.tag!))
        .collect();

      tagEntries.forEach((t) => taggedNoteIds.add(t.noteId));
      notes = notes.filter((n) => taggedNoteIds.has(n._id));
    }

    // 排序
    switch (sortBy) {
      case "popular":
        notes.sort((a, b) => b.likesCount - a.likesCount);
        break;
      case "trending":
        // 结合时间和热度的排序
        notes.sort((a, b) => {
          const aScore =
            a.likesCount * 2 +
            a.commentsCount +
            a.viewsCount / 10 -
            (Date.now() - a.createdAt) / (1000 * 60 * 60 * 24);
          const bScore =
            b.likesCount * 2 +
            b.commentsCount +
            b.viewsCount / 10 -
            (Date.now() - b.createdAt) / (1000 * 60 * 60 * 24);
          return bScore - aScore;
        });
        break;
      case "latest":
      default:
        // 已经按时间排序
        break;
    }

    const total = notes.length;
    const data = notes.slice(offset, offset + pageSize);

    // 丰富数据
    const enriched = await Promise.all(
      data.map(async (note) => {
        const images = await ctx.db
          .query("noteImages")
          .withIndex("by_note", (q) => q.eq("noteId", note._id))
          .collect();

        const tags = await ctx.db
          .query("noteTags")
          .withIndex("by_note", (q) => q.eq("noteId", note._id))
          .collect();

        const profile = await ctx.db
          .query("profiles")
          .filter((q) => q.eq(q.field("email"), note.authorId))
          .first();

        return {
          ...note,
          imageCount: images.length,
          coverImage: images.find((i) => i.isCover)?.url ?? images[0]?.url,
          tags: tags.map((t) => t.tag),
          authorName: profile?.displayName,
          authorAvatar: profile?.avatarUrl,
        };
      }),
    );

    return { data: enriched, total };
  },
});

// 获取游记详情
export const getById = query({
  args: {
    id: v.id("travelNotes"),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.id);
    if (!note) return null;

    // 检查权限（公开或作者）
    if (
      note.visibility !== "public" &&
      (!args.userId || note.authorId !== args.userId)
    ) {
      return null;
    }

    // 获取图片
    const images = await ctx.db
      .query("noteImages")
      .withIndex("by_note", (q) => q.eq("noteId", args.id))
      .collect();
    images.sort((a, b) => a.orderIndex - b.orderIndex);

    // 获取标签
    const tags = await ctx.db
      .query("noteTags")
      .withIndex("by_note", (q) => q.eq("noteId", args.id))
      .collect();

    // 获取作者信息
    const profile = await ctx.db
      .query("profiles")
      .filter((q) => q.eq(q.field("email"), note.authorId))
      .first();

    // 获取关联的行程
    let itinerary = null;
    if (note.itineraryId) {
      itinerary = await ctx.db.get(note.itineraryId);
    }

    // 获取关联的 POIs
    const notePois = await ctx.db
      .query("notePois")
      .withIndex("by_note", (q) => q.eq("noteId", args.id))
      .collect();

    const pois = await Promise.all(
      notePois.map(async (np) => {
        const poi = await ctx.db.get(np.poiId);
        return poi
          ? {
              ...poi,
              notePoiId: np._id,
              mentionIndex: np.mentionIndex,
            }
          : null;
      }),
    );

    return {
      ...note,
      images: images.map((i) => ({
        id: i._id,
        url: i.url,
        caption: i.caption,
        isCover: i.isCover,
        orderIndex: i.orderIndex,
      })),
      tags: tags.map((t) => t.tag),
      authorName: profile?.displayName,
      authorAvatar: profile?.avatarUrl,
      itinerary: itinerary
        ? {
            id: itinerary._id,
            title: itinerary.title,
          }
        : null,
      pois: pois.filter((p) => p !== null),
    };
  },
});

// 创建游记
export const create = mutation({
  args: {
    authorId: v.string(),
    title: v.string(),
    content: v.string(),
    visibility: v.optional(visibilityValidator),
    itineraryId: v.optional(v.id("itineraries")),
    location: v.optional(v.string()),
    travelDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const noteId = await ctx.db.insert("travelNotes", {
      authorId: args.authorId,
      title: args.title,
      content: args.content,
      visibility: args.visibility ?? "public",
      itineraryId: args.itineraryId,
      location: args.location,
      travelDate: args.travelDate,
      likesCount: 0,
      commentsCount: 0,
      viewsCount: 0,
      savesCount: 0,
      isEdited: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return noteId;
  },
});

// 更新游记
export const update = mutation({
  args: {
    id: v.id("travelNotes"),
    userId: v.string(),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    visibility: v.optional(visibilityValidator),
    location: v.optional(v.string()),
    travelDate: v.optional(v.string()),
    itineraryId: v.optional(v.id("itineraries")),
  },
  handler: async (ctx, args) => {
    await checkEditPermission(ctx, args.id, args.userId);

    const { id, userId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined),
    );

    await ctx.db.patch(id, {
      ...filteredUpdates,
      isEdited: true,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(id);
  },
});

// 删除游记
export const remove = mutation({
  args: {
    id: v.id("travelNotes"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    await checkEditPermission(ctx, args.id, args.userId);

    // 删除相关图片记录
    const images = await ctx.db
      .query("noteImages")
      .withIndex("by_note", (q) => q.eq("noteId", args.id))
      .collect();
    for (const image of images) {
      await ctx.db.delete(image._id);
    }

    // 删除相关标签记录
    const tags = await ctx.db
      .query("noteTags")
      .withIndex("by_note", (q) => q.eq("noteId", args.id))
      .collect();
    for (const tag of tags) {
      await ctx.db.delete(tag._id);
    }

    // 删除相关 POI 关联
    const pois = await ctx.db
      .query("notePois")
      .withIndex("by_note", (q) => q.eq("noteId", args.id))
      .collect();
    for (const poi of pois) {
      await ctx.db.delete(poi._id);
    }

    // 删除相关点赞
    const likes = await ctx.db
      .query("noteLikes")
      .withIndex("by_note", (q) => q.eq("noteId", args.id))
      .collect();
    for (const like of likes) {
      await ctx.db.delete(like._id);
    }

    // 删除相关评论
    const comments = await ctx.db
      .query("noteComments")
      .withIndex("by_note", (q) => q.eq("noteId", args.id))
      .collect();
    for (const comment of comments) {
      await ctx.db.delete(comment._id);
    }

    // 删除游记本身
    await ctx.db.delete(args.id);
  },
});

// 增加浏览量
export const incrementViews = mutation({
  args: {
    id: v.id("travelNotes"),
  },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.id);
    if (!note) {
      throw new Error("Travel note not found");
    }

    await ctx.db.patch(args.id, {
      viewsCount: note.viewsCount + 1,
    });
  },
});

// ============================================
// 图片管理
// ============================================

// 添加图片到游记
export const addImage = mutation({
  args: {
    noteId: v.id("travelNotes"),
    userId: v.string(),
    url: v.string(),
    caption: v.optional(v.string()),
    isCover: v.optional(v.boolean()),
    orderIndex: v.number(),
  },
  handler: async (ctx, args) => {
    await checkEditPermission(ctx, args.noteId, args.userId);

    // 如果设置为封面，取消其他封面
    if (args.isCover) {
      const images = await ctx.db
        .query("noteImages")
        .withIndex("by_note", (q) => q.eq("noteId", args.noteId))
        .collect();

      for (const image of images) {
        if (image.isCover) {
          await ctx.db.patch(image._id, { isCover: false });
        }
      }
    }

    const imageId = await ctx.db.insert("noteImages", {
      noteId: args.noteId,
      url: args.url,
      caption: args.caption,
      isCover: args.isCover ?? false,
      orderIndex: args.orderIndex,
      createdAt: Date.now(),
    });

    return imageId;
  },
});

// 删除图片
export const removeImage = mutation({
  args: {
    imageId: v.id("noteImages"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const image = await ctx.db.get(args.imageId);
    if (!image) {
      throw new Error("Image not found");
    }

    await checkEditPermission(ctx, image.noteId, args.userId);
    await ctx.db.delete(args.imageId);
  },
});

// 批量添加图片
export const addImages = mutation({
  args: {
    noteId: v.id("travelNotes"),
    userId: v.string(),
    images: v.array(
      v.object({
        url: v.string(),
        caption: v.optional(v.string()),
        isCover: v.optional(v.boolean()),
        orderIndex: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    await checkEditPermission(ctx, args.noteId, args.userId);

    const imageIds: Id<"noteImages">[] = [];

    for (const image of args.images) {
      // 如果设置为封面，取消其他封面
      if (image.isCover) {
        const existingImages = await ctx.db
          .query("noteImages")
          .withIndex("by_note", (q) => q.eq("noteId", args.noteId))
          .collect();

        for (const existing of existingImages) {
          if (existing.isCover) {
            await ctx.db.patch(existing._id, { isCover: false });
          }
        }
      }

      const imageId = await ctx.db.insert("noteImages", {
        noteId: args.noteId,
        url: image.url,
        caption: image.caption,
        isCover: image.isCover ?? false,
        orderIndex: image.orderIndex,
        createdAt: Date.now(),
      });

      imageIds.push(imageId);
    }

    return imageIds;
  },
});

// ============================================
// 标签管理
// ============================================

// 添加标签
export const addTag = mutation({
  args: {
    noteId: v.id("travelNotes"),
    userId: v.string(),
    tag: v.string(),
  },
  handler: async (ctx, args) => {
    await checkEditPermission(ctx, args.noteId, args.userId);

    // 检查标签是否已存在
    const existing = await ctx.db
      .query("noteTags")
      .withIndex("by_note", (q) => q.eq("noteId", args.noteId))
      .filter((q) => q.eq(q.field("tag"), args.tag))
      .first();

    if (existing) {
      return existing._id;
    }

    const tagId = await ctx.db.insert("noteTags", {
      noteId: args.noteId,
      tag: args.tag.trim().toLowerCase(),
      createdAt: Date.now(),
    });

    return tagId;
  },
});

// 删除标签
export const removeTag = mutation({
  args: {
    noteId: v.id("travelNotes"),
    userId: v.string(),
    tag: v.string(),
  },
  handler: async (ctx, args) => {
    await checkEditPermission(ctx, args.noteId, args.userId);

    const existing = await ctx.db
      .query("noteTags")
      .withIndex("by_note", (q) => q.eq("noteId", args.noteId))
      .filter((q) => q.eq(q.field("tag"), args.tag))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

// 批量设置标签
export const setTags = mutation({
  args: {
    noteId: v.id("travelNotes"),
    userId: v.string(),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await checkEditPermission(ctx, args.noteId, args.userId);

    // 删除现有标签
    const existingTags = await ctx.db
      .query("noteTags")
      .withIndex("by_note", (q) => q.eq("noteId", args.noteId))
      .collect();

    for (const tag of existingTags) {
      await ctx.db.delete(tag._id);
    }

    // 添加新标签
    const uniqueTags = [
      ...new Set(args.tags.map((t) => t.trim().toLowerCase())),
    ];

    for (const tag of uniqueTags) {
      if (tag) {
        await ctx.db.insert("noteTags", {
          noteId: args.noteId,
          tag,
          createdAt: Date.now(),
        });
      }
    }
  },
});

// 获取热门标签
export const getPopularTags = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    // 获取所有标签
    const allTags = await ctx.db.query("noteTags").collect();

    // 统计标签使用次数
    const tagCounts: Record<string, number> = {};
    for (const tag of allTags) {
      tagCounts[tag.tag] = (tagCounts[tag.tag] || 0) + 1;
    }

    // 排序并返回
    const sorted = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    return sorted.map(([tag, count]) => ({ tag, count }));
  },
});

// ============================================
// POI 关联管理
// ============================================

// 关联 POI 到游记
export const addPoi = mutation({
  args: {
    noteId: v.id("travelNotes"),
    userId: v.string(),
    poiId: v.id("pois"),
    mentionIndex: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await checkEditPermission(ctx, args.noteId, args.userId);

    // 检查是否已关联
    const existing = await ctx.db
      .query("notePois")
      .withIndex("by_note", (q) => q.eq("noteId", args.noteId))
      .filter((q) => q.eq(q.field("poiId"), args.poiId))
      .first();

    if (existing) {
      return existing._id;
    }

    const notePoiId = await ctx.db.insert("notePois", {
      noteId: args.noteId,
      poiId: args.poiId,
      mentionIndex: args.mentionIndex,
      createdAt: Date.now(),
    });

    return notePoiId;
  },
});

// 移除 POI 关联
export const removePoi = mutation({
  args: {
    noteId: v.id("travelNotes"),
    userId: v.string(),
    poiId: v.id("pois"),
  },
  handler: async (ctx, args) => {
    await checkEditPermission(ctx, args.noteId, args.userId);

    const existing = await ctx.db
      .query("notePois")
      .withIndex("by_note", (q) => q.eq("noteId", args.noteId))
      .filter((q) => q.eq(q.field("poiId"), args.poiId))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

// ============================================
// 搜索
// ============================================

// 搜索游记
export const search = query({
  args: {
    query: v.string(),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const page = args.page ?? 1;
    const pageSize = args.pageSize ?? 20;
    const offset = (page - 1) * pageSize;
    const searchQuery = args.query.toLowerCase();

    // 获取所有公开游记
    let notes = await ctx.db
      .query("travelNotes")
      .withIndex("by_visibility", (q) => q.eq("visibility", "public"))
      .collect();

    // 搜索标题和内容
    notes = notes.filter(
      (n) =>
        n.title.toLowerCase().includes(searchQuery) ||
        n.content.toLowerCase().includes(searchQuery) ||
        (n.location && n.location.toLowerCase().includes(searchQuery)),
    );

    // 也搜索标签
    const matchingTags = await ctx.db
      .query("noteTags")
      .withIndex("by_tag", (q) => q.eq("tag", searchQuery))
      .collect();

    const tagNoteIds = new Set(matchingTags.map((t) => t.noteId as string));
    notes = [
      ...notes,
      ...(
        await Promise.all(
          Array.from(tagNoteIds).map((id) =>
            ctx.db.get(id as Id<"travelNotes">),
          ),
        )
      ).filter(
        (n) =>
          n !== null &&
          n.visibility === "public" &&
          !notes.some((existing) => existing._id === n._id),
      ),
    ] as typeof notes;

    // 按相关性排序（简单实现：标题匹配优先）
    notes.sort((a, b) => {
      const aInTitle = a.title.toLowerCase().includes(searchQuery) ? 1 : 0;
      const bInTitle = b.title.toLowerCase().includes(searchQuery) ? 1 : 0;
      if (aInTitle !== bInTitle) return bInTitle - aInTitle;
      return b.createdAt - a.createdAt;
    });

    const total = notes.length;
    const data = notes.slice(offset, offset + pageSize);

    // 丰富数据
    const enriched = await Promise.all(
      data.map(async (note) => {
        const images = await ctx.db
          .query("noteImages")
          .withIndex("by_note", (q) => q.eq("noteId", note._id))
          .collect();

        const tags = await ctx.db
          .query("noteTags")
          .withIndex("by_note", (q) => q.eq("noteId", note._id))
          .collect();

        const profile = await ctx.db
          .query("profiles")
          .filter((q) => q.eq(q.field("email"), note.authorId))
          .first();

        return {
          ...note,
          imageCount: images.length,
          coverImage: images.find((i) => i.isCover)?.url ?? images[0]?.url,
          tags: tags.map((t) => t.tag),
          authorName: profile?.displayName,
          authorAvatar: profile?.avatarUrl,
        };
      }),
    );

    return { data: enriched, total };
  },
});
