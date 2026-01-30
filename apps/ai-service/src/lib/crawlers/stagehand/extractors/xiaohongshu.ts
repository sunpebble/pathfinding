import { z } from 'zod';
import { authorSchema, imageSchema, statsSchema } from './common';

// 小红书笔记基础信息
export const xhsNoteSchema = z.object({
  noteId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  type: z.enum(['normal', 'video']),
  author: authorSchema,
  stats: statsSchema.optional(),
  images: z.array(imageSchema).optional(),
  video: z
    .object({
      url: z.string().url(),
      coverUrl: z.string().url().optional(),
      duration: z.number().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
    })
    .optional(),
  tags: z.array(z.string()).optional(),
  publishDate: z.string().optional(),
});

// 小红书视频信息
export const xhsVideoSchema = z.object({
  url: z.string().url(),
  coverUrl: z.string().url().optional(),
  duration: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
});

// 小红书评论
export const xhsCommentSchema = z.object({
  id: z.string(),
  content: z.string(),
  author: z.string(),
  authorAvatar: z.string().url().optional(),
  authorId: z.string().optional(),
  likes: z.number().optional(),
  replyCount: z.number().optional(),
  createTime: z.string().optional(),
  parentCommentId: z.string().optional(),
});

// 小红书搜索结果项
export const xhsSearchResultSchema = z.object({
  noteId: z.string(),
  title: z.string(),
  coverUrl: z.string().url().optional(),
  author: z.string(),
  authorAvatar: z.string().url().optional(),
  likes: z.number().optional(),
  type: z.enum(['normal', 'video']).optional(),
});

// 小红书用户资料
export const xhsUserProfileSchema = z.object({
  userId: z.string(),
  nickname: z.string(),
  avatar: z.string().url().optional(),
  followers: z.number().optional(),
  following: z.number().optional(),
  notes: z.number().optional(),
  likes: z.number().optional(),
  collections: z.number().optional(),
});

// 小红书互动信息
export const xhsInteractionSchema = z.object({
  likes: z.number().optional(),
  collections: z.number().optional(),
  comments: z.number().optional(),
  shares: z.number().optional(),
});

// 导出类型
export type XhsNote = z.infer<typeof xhsNoteSchema>;
export type XhsVideo = z.infer<typeof xhsVideoSchema>;
export type XhsComment = z.infer<typeof xhsCommentSchema>;
export type XhsSearchResult = z.infer<typeof xhsSearchResultSchema>;
export type XhsUserProfile = z.infer<typeof xhsUserProfileSchema>;
export type XhsInteraction = z.infer<typeof xhsInteractionSchema>;
