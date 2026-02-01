/**
 * Mafengwo Crawler - AI-powered travel guide extraction
 *
 * Uses Stagehand's AI capabilities (act, extract) to crawl travel guides
 * from Mafengwo without relying on brittle CSS selectors or regex patterns.
 */

import type { AICrawlOptions } from './ai-crawler-base.js';
import type { BrowserClient } from './clients/index.js';
import type { CrawlOptions, CrawlResult } from './index.js';
import { AICrawlerBase } from './ai-crawler-base.js';

const CITY_IDS: Record<string, string> = {
  北京: '10065',
  上海: '10099',
  杭州: '10156',
  成都: '10332',
  西安: '10195',
  三亚: '10186',
  厦门: '10132',
  大理: '10487',
  广州: '10088',
  深圳: '10086',
  南京: '10183',
  苏州: '10206',
  丽江: '10460',
  重庆: '10208',
  武汉: '10140',
};

/**
 * Mafengwo AI Crawler
 * Extracts travel guides using Stagehand's AI-powered extraction
 */
class MafengwoAICrawler extends AICrawlerBase {
  constructor() {
    super('mafengwo', '马蜂窝');
  }

  protected getCityId(city: string): string | undefined {
    return CITY_IDS[city];
  }

  protected getListPageUrl(city: string, page: number): string {
    const cityId = this.getCityId(city);
    // Mafengwo travel notes list page: /yj/{cityId}/1-0-{page}.html
    // Format: /yj/城市ID/排序-类型-页码.html
    return `https://www.mafengwo.cn/yj/${cityId}/1-0-${page}.html`;
  }

  protected getSourceExternalId(url: string): string {
    const match = url.match(/\/i\/(\d+)\.html/);
    return `mafengwo_${match?.[1] || Date.now()}`;
  }

  protected getListExtractionInstruction(city: string): string {
    return `
      从马蜂窝旅游页面中提取所有游记/攻略的列表。
      目标城市: ${city}
      
      请提取每篇游记的:
      - 标题 (title)
      - 详情页链接URL (url) - 通常是 /i/数字.html 格式的链接，请返回完整URL
      - 作者名称 (author)
      - 缩略图URL (thumbnail)
      
      只提取游记类内容（/i/ 开头的链接），忽略酒店、景点介绍等其他链接。
      确保URL是完整的，如果是相对路径请补全为 https://www.mafengwo.cn 开头的完整URL。
    `;
  }

  protected getDetailExtractionInstruction(): string {
    return `
      从这篇马蜂窝游记页面中提取完整信息。
      
      请提取:
      - 文章标题 (title)
      - 完整的游记正文内容 (content) - 保留段落结构，提取所有文字内容
      - 作者信息 (author):
        - 名称 (name) - 蜂首/作者名
        - 头像URL (avatar)
      - 发布日期 (publishDate) - 格式为 YYYY-MM-DD
      - 所有配图的URL (images) - 提取高清大图URL，马蜂窝图片通常有多种尺寸
      - 统计数据 (stats):
        - 浏览量 (views)
        - 点赞数 (likes) - 顶/赞
        - 评论数 (comments)
        - 收藏数 (saves)
      - 文章标签 (tags)
      - 提到的目的地/景点名称 (destinations)
      
      注意：
      1. 内容要完整，马蜂窝游记通常很长
      2. 图片URL优先选择大图版本
      3. 数字统计如果带有"万"等单位，请转换为实际数字（如 1.2万 = 12000）
    `;
  }
}

// Singleton instance
const mafengwoCrawler = new MafengwoAICrawler();

/**
 * Crawl Mafengwo for travel guides using AI extraction
 *
 * @param city - City name in Chinese (e.g., "北京", "上海")
 * @param options - Crawl options
 * @returns Array of crawl results
 */
export async function crawlMafengwo(
  city: string,
  options: CrawlOptions & { client?: BrowserClient } = {},
): Promise<CrawlResult[]> {
  const aiOptions: AICrawlOptions = {
    maxPages: options.maxPages || 5,
    maxGuidesPerPage: 10,
  };

  return mafengwoCrawler.crawl(city, aiOptions);
}

// Export the crawler class for direct use
export { MafengwoAICrawler };
