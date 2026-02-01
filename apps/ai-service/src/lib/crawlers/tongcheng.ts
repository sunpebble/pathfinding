/**
 * Tongcheng (同程旅行) Crawler - AI-powered travel guide extraction
 *
 * Uses Stagehand's AI capabilities (act, extract) to crawl travel guides
 * from Tongcheng without relying on brittle CSS selectors or regex patterns.
 */

import type { AICrawlOptions } from './ai-crawler-base.js';
import type { BrowserClient } from './clients/index.js';
import type { CrawlOptions, CrawlResult } from './index.js';
import { AICrawlerBase } from './ai-crawler-base.js';

const CITY_SLUGS: Record<string, string> = {
  北京: 'beijing',
  上海: 'shanghai',
  杭州: 'hangzhou',
  成都: 'chengdu',
  西安: 'xian',
  三亚: 'sanya',
  厦门: 'xiamen',
  大理: 'dali',
  广州: 'guangzhou',
  深圳: 'shenzhen',
  南京: 'nanjing',
  苏州: 'suzhou',
  丽江: 'lijiang',
  重庆: 'chongqing',
  武汉: 'wuhan',
  青岛: 'qingdao',
  桂林: 'guilin',
  昆明: 'kunming',
  西双版纳: 'xishuangbanna',
  张家界: 'zhangjiajie',
};

/**
 * Tongcheng AI Crawler
 * Extracts travel guides using Stagehand's AI-powered extraction
 */
class TongchengAICrawler extends AICrawlerBase {
  constructor() {
    super('tongcheng', '同程');
  }

  protected getCityId(city: string): string | undefined {
    return CITY_SLUGS[city] || city.toLowerCase();
  }

  protected getListPageUrl(_city: string, _page: number): string {
    // Tongcheng uses a single travels page with filtering
    return 'https://www.ly.com/travels/';
  }

  protected getSourceExternalId(url: string): string {
    const match = url.match(/\/travels\/(\d+)\.html/);
    return `tongcheng_${match?.[1] || Date.now()}`;
  }

  protected getListExtractionInstruction(city: string): string {
    return `
      从同程旅行游记列表页面中提取所有游记/攻略的列表。
      目标城市: ${city}
      
      请提取每篇游记的:
      - 标题 (title)
      - 详情页链接URL (url) - 通常是 /travels/数字.html 格式的链接，请返回完整URL
      - 作者名称 (author)
      - 缩略图URL (thumbnail)
      
      优先提取与目标城市 "${city}" 相关的游记。
      确保URL是完整的，如果是相对路径请补全为 https://www.ly.com 开头的完整URL。
    `;
  }

  protected getDetailExtractionInstruction(): string {
    return `
      从这篇同程旅行游记页面中提取完整信息。
      
      请提取:
      - 文章标题 (title)
      - 完整的游记正文内容 (content) - 保留段落结构，提取所有文字内容
      - 作者信息 (author):
        - 名称 (name)
        - 头像URL (avatar)
      - 发布日期 (publishDate) - 格式为 YYYY-MM-DD
      - 所有配图的URL (images) - 提取高清大图URL
      - 统计数据 (stats):
        - 浏览量 (views)
        - 点赞数 (likes)
        - 评论数 (comments)
        - 收藏数 (saves)
      - 文章标签 (tags)
      - 提到的目的地/景点名称 (destinations)
      
      注意：
      1. 内容要完整，不要截断
      2. 图片URL优先选择大图版本
      3. 数字统计如果带有"万"等单位，请转换为实际数字
    `;
  }
}

// Singleton instance
const tongchengCrawler = new TongchengAICrawler();

/**
 * Crawl Tongcheng for travel guides using AI extraction
 *
 * @param city - City name in Chinese (e.g., "北京", "上海")
 * @param options - Crawl options
 * @returns Array of crawl results
 */
export async function crawlTongcheng(
  city: string,
  options: CrawlOptions & { client?: BrowserClient } = {},
): Promise<CrawlResult[]> {
  const aiOptions: AICrawlOptions = {
    maxPages: options.maxPages || 5,
    maxGuidesPerPage: 10,
  };

  return tongchengCrawler.crawl(city, aiOptions);
}

// Export the crawler class for direct use
export { TongchengAICrawler };
