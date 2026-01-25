import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
/**
 * Note Comments - 游记评论相关操作
 */
// 添加评论
export const create = mutation({
    args: {
        noteId: v.id('travelNotes'),
        userId: v.string(),
        content: v.string(),
        parentId: v.optional(v.id('noteComments')),
    },
    handler: async (ctx, args) => {
        // 检查游记是否存在且可访问
        const note = await ctx.db.get(args.noteId);
        if (!note) {
            throw new Error('Travel note not found');
        }
        if (note.visibility !== 'public' && note.authorId !== args.userId) {
            throw new Error('Cannot comment on a private travel note');
        }
        // 如果是回复，检查父评论是否存在
        if (args.parentId) {
            const parent = await ctx.db.get(args.parentId);
            if (!parent || parent.noteId !== args.noteId) {
                throw new Error('Parent comment not found');
            }
            // 更新父评论的回复数
            await ctx.db.patch(args.parentId, {
                repliesCount: parent.repliesCount + 1,
            });
        }
        const commentId = await ctx.db.insert('noteComments', {
            noteId: args.noteId,
            userId: args.userId,
            content: args.content,
            parentId: args.parentId,
            likesCount: 0,
            repliesCount: 0,
            isEdited: false,
            isDeleted: false,
            createdAt: Date.now(),
        });
        // 更新游记评论数
        await ctx.db.patch(args.noteId, {
            commentsCount: note.commentsCount + 1,
        });
        return commentId;
    },
});
// 更新评论
export const update = mutation({
    args: {
        commentId: v.id('noteComments'),
        userId: v.string(),
        content: v.string(),
    },
    handler: async (ctx, args) => {
        const comment = await ctx.db.get(args.commentId);
        if (!comment) {
            throw new Error('Comment not found');
        }
        if (comment.userId !== args.userId) {
            throw new Error('You can only edit your own comments');
        }
        if (comment.isDeleted) {
            throw new Error('Cannot edit a deleted comment');
        }
        await ctx.db.patch(args.commentId, {
            content: args.content,
            isEdited: true,
            updatedAt: Date.now(),
        });
        return await ctx.db.get(args.commentId);
    },
});
// 删除评论（软删除）
export const remove = mutation({
    args: {
        commentId: v.id('noteComments'),
        userId: v.string(),
    },
    handler: async (ctx, args) => {
        const comment = await ctx.db.get(args.commentId);
        if (!comment) {
            throw new Error('Comment not found');
        }
        // 检权限：评论作者或游记作者可以删除
        const note = await ctx.db.get(comment.noteId);
        if (comment.userId !== args.userId && note?.authorId !== args.userId) {
            throw new Error('You do not have permission to delete this comment');
        }
        // 软删除
        await ctx.db.patch(args.commentId, {
            isDeleted: true,
            content: '[评论已删除]',
            updatedAt: Date.now(),
        });
        // 更新游记评论数
        if (note) {
            await ctx.db.patch(note._id, {
                commentsCount: Math.max(0, note.commentsCount - 1),
            });
        }
    },
});
// 获取游记的评论列表
export const listByNote = query({
    args: {
        noteId: v.id('travelNotes'),
        page: v.optional(v.number()),
        pageSize: v.optional(v.number()),
        sortBy: v.optional(v.union(v.literal('latest'), v.literal('popular'))),
    },
    handler: async (ctx, args) => {
        const page = args.page ?? 1;
        const pageSize = args.pageSize ?? 20;
        const offset = (page - 1) * pageSize;
        const sortBy = args.sortBy ?? 'latest';
        // 获取顶级评论（非回复）
        let comments = await ctx.db
            .query('noteComments')
            .withIndex('by_note', (q) => q.eq('noteId', args.noteId))
            .collect();
        // 只获取顶级评论
        comments = comments.filter((c) => !c.parentId);
        // 排序
        if (sortBy === 'popular') {
            comments.sort((a, b) => b.likesCount - a.likesCount);
        }
        else {
            comments.sort((a, b) => b.createdAt - a.createdAt);
        }
        const total = comments.length;
        const data = comments.slice(offset, offset + pageSize);
        // 丰富数据
        const enriched = await Promise.all(data.map(async (comment) => {
            // 获取用户信息
            const profile = await ctx.db
                .query('profiles')
                .filter((q) => q.eq(q.field('email'), comment.userId))
                .first();
            // 获取回复（最多3条）
            const replies = await ctx.db
                .query('noteComments')
                .withIndex('by_parent', (q) => q.eq('parentId', comment._id))
                .order('asc')
                .take(3);
            const enrichedReplies = await Promise.all(replies.map(async (reply) => {
                const replyProfile = await ctx.db
                    .query('profiles')
                    .filter((q) => q.eq(q.field('email'), reply.userId))
                    .first();
                return {
                    ...reply,
                    userName: replyProfile?.displayName ?? '匿名用户',
                    userAvatar: replyProfile?.avatarUrl,
                };
            }));
            return {
                ...comment,
                userName: profile?.displayName ?? '匿名用户',
                userAvatar: profile?.avatarUrl,
                replies: enrichedReplies,
            };
        }));
        return { data: enriched, total };
    },
});
// 获取评论的回复列表
export const listReplies = query({
    args: {
        parentId: v.id('noteComments'),
        page: v.optional(v.number()),
        pageSize: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const page = args.page ?? 1;
        const pageSize = args.pageSize ?? 20;
        const offset = (page - 1) * pageSize;
        const replies = await ctx.db
            .query('noteComments')
            .withIndex('by_parent', (q) => q.eq('parentId', args.parentId))
            .order('asc')
            .collect();
        const total = replies.length;
        const data = replies.slice(offset, offset + pageSize);
        // 丰富数据
        const enriched = await Promise.all(data.map(async (reply) => {
            const profile = await ctx.db
                .query('profiles')
                .filter((q) => q.eq(q.field('email'), reply.userId))
                .first();
            return {
                ...reply,
                userName: profile?.displayName ?? '匿名用户',
                userAvatar: profile?.avatarUrl,
            };
        }));
        return { data: enriched, total };
    },
});
// 点赞评论
export const toggleLike = mutation({
    args: {
        commentId: v.id('noteComments'),
        userId: v.string(),
    },
    handler: async (ctx, args) => {
        const comment = await ctx.db.get(args.commentId);
        if (!comment) {
            throw new Error('Comment not found');
        }
        // 检查是否已点赞
        const existing = await ctx.db
            .query('noteCommentLikes')
            .withIndex('by_comment_user', (q) => q.eq('commentId', args.commentId).eq('userId', args.userId))
            .first();
        if (existing) {
            // 取消点赞
            await ctx.db.delete(existing._id);
            await ctx.db.patch(args.commentId, {
                likesCount: Math.max(0, comment.likesCount - 1),
            });
            return { liked: false };
        }
        else {
            // 添加点赞
            await ctx.db.insert('noteCommentLikes', {
                commentId: args.commentId,
                userId: args.userId,
                createdAt: Date.now(),
            });
            await ctx.db.patch(args.commentId, {
                likesCount: comment.likesCount + 1,
            });
            return { liked: true };
        }
    },
});
// 检查评论点赞状态
export const isCommentLiked = query({
    args: {
        commentId: v.id('noteComments'),
        userId: v.string(),
    },
    handler: async (ctx, args) => {
        const like = await ctx.db
            .query('noteCommentLikes')
            .withIndex('by_comment_user', (q) => q.eq('commentId', args.commentId).eq('userId', args.userId))
            .first();
        return { liked: !!like };
    },
});
// 批量检查评论点赞状态
export const batchCheckCommentLikes = query({
    args: {
        userId: v.string(),
        commentIds: v.array(v.id('noteComments')),
    },
    handler: async (ctx, args) => {
        const results = {};
        await Promise.all(args.commentIds.map(async (commentId) => {
            const like = await ctx.db
                .query('noteCommentLikes')
                .withIndex('by_comment_user', (q) => q.eq('commentId', commentId).eq('userId', args.userId))
                .first();
            results[commentId] = !!like;
        }));
        return results;
    },
});
// 获取用户的评论列表
export const listByUser = query({
    args: {
        userId: v.string(),
        page: v.optional(v.number()),
        pageSize: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const page = args.page ?? 1;
        const pageSize = args.pageSize ?? 20;
        const offset = (page - 1) * pageSize;
        const comments = await ctx.db
            .query('noteComments')
            .withIndex('by_user', (q) => q.eq('userId', args.userId))
            .order('desc')
            .collect();
        const total = comments.length;
        const data = comments.slice(offset, offset + pageSize);
        // 丰富数据
        const enriched = await Promise.all(data.map(async (comment) => {
            const note = await ctx.db.get(comment.noteId);
            return {
                ...comment,
                noteTitle: note?.title,
            };
        }));
        return { data: enriched, total };
    },
});
