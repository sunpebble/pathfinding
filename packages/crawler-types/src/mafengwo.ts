/**
 * 马蜂窝爬虫类型定义
 * 包含目的地、POI、攻略、问答等数据结构
 */

// ============================================
// 通用类型
// ============================================

/** 马蜂窝数据来源 */
export type MafengwoSource = "mafengwo";

/** 马蜂窝内容类型 */
export type MafengwoContentType =
  | "destination" // 目的地
  | "poi" // 景点/餐厅/酒店
  | "guide" // 攻略
  | "travel_note" // 游记
  | "qa" // 问答
  | "ranking" // 榜单
  | "review"; // 评论

/** POI 类别 */
export type MafengwoPOICategory =
  | "attraction" // 景点
  | "restaurant" // 餐厅
  | "hotel" // 酒店
  | "shopping" // 购物
  | "entertainment" // 娱乐
  | "transport"; // 交通

// ============================================
// 目的地/城市
// ============================================

/** 马蜂窝目的地原始数据 */
export interface MafengwoDestinationRaw {
  mddId: string; // 目的地 ID (如 "10065")
  name: string; // 中文名 (如 "北京")
  nameEn?: string; // 英文名 (如 "Beijing")
  country?: string; // 国家
  province?: string; // 省份
  description?: string; // 简介
  coverImage?: string; // 封面图
  images: string[]; // 图片列表
  // 统计数据
  travelNotesCount?: number; // 游记数
  poisCount?: number; // POI 数
  questionsCount?: number; // 问答数
  // 地理信息
  latitude?: number;
  longitude?: number;
  timezone?: string;
  // 旅行信息
  bestTravelTime?: string; // 最佳旅行时间
  avgStayDays?: string; // 平均停留天数
  // 实用信息
  climate?: string;
  language?: string;
  currency?: string;
  visa?: string;
}

/** 马蜂窝目的地（转换后） */
export interface MafengwoDestination {
  source: MafengwoSource;
  sourceExternalId: string;
  sourceUrl: string;
  name: string;
  nameEn?: string;
  country?: string;
  province?: string;
  description?: string;
  coverImageUrl?: string;
  imageUrls: string[];
  latitude?: number;
  longitude?: number;
  timezone?: string;
  bestTravelTime?: string;
  avgStayDays?: string;
  climate?: string;
  language?: string;
  currency?: string;
  visa?: string;
  travelNotesCount: number;
  poisCount: number;
  questionsCount: number;
  crawledAt: number;
}

// ============================================
// POI (景点/餐厅/酒店等)
// ============================================

/** 马蜂窝 POI 原始数据 */
export interface MafengwoPOIRaw {
  poiId: string; // POI ID
  name: string;
  nameEn?: string;
  category: MafengwoPOICategory;
  destinationId?: string; // 所属目的地 ID
  destinationName?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  // 评分
  rating?: number; // 0-5
  ratingCount?: number;
  // 价格
  priceLevel?: number; // 1-4
  priceRange?: string; // 如 "人均50-100元"
  ticketPrice?: string; // 门票价格
  // 营业信息
  openingHours?: string;
  phone?: string;
  website?: string;
  // 内容
  description?: string;
  tips?: string[];
  highlights?: string[];
  // 图片
  coverImage?: string;
  images: string[];
  // 统计
  reviewsCount?: number;
  savesCount?: number;
  // 标签
  tags?: string[];
  // 餐厅特有
  cuisineType?: string;
  signatureDishes?: string[];
  // 酒店特有
  starRating?: number; // 星级 1-5
  amenities?: string[]; // 设施
  checkInTime?: string;
  checkOutTime?: string;
}

/** 马蜂窝 POI（转换后） */
export interface MafengwoPOI {
  source: MafengwoSource;
  sourceExternalId: string;
  sourceUrl: string;
  name: string;
  nameEn?: string;
  category: MafengwoPOICategory;
  destinationId?: string;
  destinationName?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  ratingCount: number;
  priceLevel?: number;
  priceRange?: string;
  ticketPrice?: string;
  openingHours?: string;
  phone?: string;
  website?: string;
  description?: string;
  tips: string[];
  highlights: string[];
  coverImageUrl?: string;
  imageUrls: string[];
  reviewsCount: number;
  savesCount: number;
  tags: string[];
  // 餐厅
  cuisineType?: string;
  signatureDishes: string[];
  // 酒店
  starRating?: number;
  amenities: string[];
  checkInTime?: string;
  checkOutTime?: string;
  qualityScore: number;
  crawledAt: number;
}

// ============================================
// 攻略
// ============================================

/** 马蜂窝攻略原始数据 */
export interface MafengwoGuideRaw {
  guideId: string;
  title: string;
  destinationId?: string;
  destinationName?: string;
  author?: string;
  authorId?: string;
  // 内容
  summary?: string;
  content: string;
  contentHtml?: string;
  // 章节
  sections?: Array<{
    title: string;
    content: string;
    order: number;
  }>;
  // 图片
  coverImage?: string;
  images: string[];
  // 统计
  views?: string;
  likes?: string;
  saves?: string;
  comments?: string;
  // 标签
  tags?: string[];
  // 日期
  publishedAt?: string;
  updatedAt?: string;
}

/** 马蜂窝攻略（转换后） */
export interface MafengwoGuide {
  source: MafengwoSource;
  sourceExternalId: string;
  sourceUrl: string;
  title: string;
  destinationId?: string;
  destinationName?: string;
  authorName?: string;
  authorId?: string;
  summary?: string;
  content: string;
  contentHtml?: string;
  sections: Array<{
    title: string;
    content: string;
    order: number;
  }>;
  coverImageUrl?: string;
  imageUrls: string[];
  viewsCount: number;
  likesCount: number;
  savesCount: number;
  commentsCount: number;
  tags: string[];
  publishedAt?: number;
  qualityScore: number;
  crawledAt: number;
}

// ============================================
// 问答
// ============================================

/** 马蜂窝问题原始数据 */
export interface MafengwoQuestionRaw {
  questionId: string;
  title: string;
  content: string;
  destinationId?: string;
  destinationName?: string;
  author?: string;
  authorId?: string;
  // 统计
  answersCount?: number;
  views?: string;
  // 标签
  tags?: string[];
  // 日期
  createdAt?: string;
  // 最佳答案
  bestAnswer?: {
    content: string;
    author?: string;
    authorId?: string;
    likes?: number;
    createdAt?: string;
  };
}

/** 马蜂窝问答（转换后） */
export interface MafengwoQA {
  source: MafengwoSource;
  sourceExternalId: string;
  sourceUrl: string;
  title: string;
  content: string;
  destinationId?: string;
  destinationName?: string;
  authorName?: string;
  authorId?: string;
  answersCount: number;
  viewsCount: number;
  tags: string[];
  createdAt?: number;
  bestAnswer?: {
    content: string;
    authorName?: string;
    authorId?: string;
    likesCount: number;
    createdAt?: number;
  };
  crawledAt: number;
}

// ============================================
// 评论
// ============================================

/** 马蜂窝评论原始数据 */
export interface MafengwoReviewRaw {
  reviewId: string;
  poiId: string;
  poiName?: string;
  author?: string;
  authorId?: string;
  authorAvatar?: string;
  // 评分
  rating?: number; // 1-5
  // 内容
  content: string;
  // 图片
  images: string[];
  // 统计
  likes?: number;
  // 日期
  visitDate?: string;
  createdAt?: string;
  // 标签
  tags?: string[];
}

/** 马蜂窝评论（转换后） */
export interface MafengwoReview {
  source: MafengwoSource;
  sourceExternalId: string;
  poiExternalId: string;
  poiName?: string;
  authorName?: string;
  authorId?: string;
  authorAvatarUrl?: string;
  rating?: number;
  content: string;
  imageUrls: string[];
  likesCount: number;
  visitDate?: string;
  tags: string[];
  createdAt?: number;
  crawledAt: number;
}

// ============================================
// 榜单
// ============================================

/** 马蜂窝榜单类型 */
export type MafengwoRankingType =
  | "must_visit" // 必去榜
  | "food" // 美食榜
  | "hotel" // 酒店榜
  | "shopping" // 购物榜
  | "hidden_gem"; // 小众榜

/** 马蜂窝榜单项原始数据 */
export interface MafengwoRankingItemRaw {
  rank: number;
  poiId: string;
  name: string;
  category?: MafengwoPOICategory;
  rating?: number;
  reviewsCount?: number;
  coverImage?: string;
  reason?: string; // 上榜理由
}

/** 马蜂窝榜单原始数据 */
export interface MafengwoRankingRaw {
  rankingId: string;
  type: MafengwoRankingType;
  title: string;
  destinationId?: string;
  destinationName?: string;
  description?: string;
  items: MafengwoRankingItemRaw[];
  updatedAt?: string;
}

/** 马蜂窝榜单（转换后） */
export interface MafengwoRanking {
  source: MafengwoSource;
  sourceExternalId: string;
  sourceUrl: string;
  type: MafengwoRankingType;
  title: string;
  destinationId?: string;
  destinationName?: string;
  description?: string;
  items: Array<{
    rank: number;
    poiExternalId: string;
    name: string;
    category?: MafengwoPOICategory;
    rating?: number;
    reviewsCount: number;
    coverImageUrl?: string;
    reason?: string;
  }>;
  crawledAt: number;
}

// ============================================
// 爬取任务配置
// ============================================

/** 马蜂窝爬取任务类型 */
export type MafengwoCrawlTaskType =
  | "destination_list" // 目的地列表
  | "destination_detail" // 目的地详情
  | "poi_list" // POI 列表
  | "poi_detail" // POI 详情
  | "guide_list" // 攻略列表
  | "guide_detail" // 攻略详情
  | "travel_note_list" // 游记列表
  | "travel_note_detail" // 游记详情
  | "qa_list" // 问答列表
  | "qa_detail" // 问答详情
  | "ranking" // 榜单
  | "review_list"; // 评论列表

/** 马蜂窝爬取任务配置 */
export interface MafengwoCrawlTaskConfig {
  taskType: MafengwoCrawlTaskType;
  destinationId?: string; // 目的地 ID
  poiCategory?: MafengwoPOICategory; // POI 类别
  rankingType?: MafengwoRankingType; // 榜单类型
  page?: number; // 分页
  pageSize?: number;
  scrollCount?: number; // 滚动次数（用于无限滚动页面）
  useAI?: boolean; // 是否使用 AI 提取
  maxRetries?: number;
}

// ============================================
// 转换器工具函数类型
// ============================================

/** 解析中文数字的结果 */
export interface ParsedNumber {
  value: number;
  original: string;
}

// QualityScoreResult is now imported from './quality-score.ts' to avoid duplication
