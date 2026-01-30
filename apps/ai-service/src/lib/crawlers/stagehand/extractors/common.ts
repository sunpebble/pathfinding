import { z } from 'zod';

// 作者信息
export const authorSchema = z.object({
  name: z.string(),
  avatar: z.string().url().optional(),
  profileUrl: z.string().url().optional(),
});

// 统计信息
export const statsSchema = z.object({
  views: z.number().optional(),
  likes: z.number().optional(),
  comments: z.number().optional(),
  shares: z.number().optional(),
  saves: z.number().optional(),
});

// 图片信息
export const imageSchema = z.object({
  url: z.string().url(),
  alt: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
});

// 视频信息
export const videoSchema = z.object({
  url: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  duration: z.number().optional(),
});

// 旅行攻略基础信息
export const travelGuideSchema = z.object({
  title: z.string(),
  summary: z.string().optional(),
  destination: z.string().optional(),
  author: authorSchema.optional(),
  publishDate: z.string().optional(),
  images: z.array(imageSchema).optional(),
  stats: statsSchema.optional(),
});

// 旅行攻略列表项
export const travelGuideListItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().url(),
  thumbnail: z.string().url().optional(),
  author: z.string().optional(),
  views: z.number().optional(),
});

// 导出类型
export type Author = z.infer<typeof authorSchema>;
export type Stats = z.infer<typeof statsSchema>;
export type Image = z.infer<typeof imageSchema>;
export type Video = z.infer<typeof videoSchema>;
export type TravelGuide = z.infer<typeof travelGuideSchema>;
export type TravelGuideListItem = z.infer<typeof travelGuideListItemSchema>;
