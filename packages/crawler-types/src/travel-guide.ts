/**
 * Travel Guide Types
 * Types for crawled travel guide content from various platforms
 */

/**
 * Data completeness level for travel guides
 * - complete: All iOS required fields present, content >= 500 chars, no truncation
 * - usable: Has title + content + at least one image, can be displayed with some missing data
 * - incomplete: Missing critical fields or truncated content, needs enhancement
 */
export type CompletenessLevel = 'complete' | 'usable' | 'incomplete';

/**
 * Supported platforms for travel guide crawling
 */
export type GuidePlatform
  = | 'xiaohongshu'
    | 'weibo'
    | 'ctrip'
    | 'douyin'
    | 'tripadvisor'
    | 'tongcheng'
    | 'mafengwo'
    | 'qunar';
