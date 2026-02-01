/**
 * Qunar Crawler - AI-powered travel guide extraction
 *
 * Uses direct LLM extraction to crawl travel guides from Qunar
 * without relying on brittle CSS selectors or regex patterns.
 *
 * Note: Qunar's URL structure has changed. The old p-cs{cityId} format
 * is deprecated. Now using travelbook/note/{cityPinyin} format.
 */

import type { AICrawlOptions } from './ai-crawler-base.js';
import type { BrowserClient } from './clients/index.js';
import type { CrawlOptions, CrawlResult } from './index.js';
import { AICrawlerBase } from './ai-crawler-base.js';

/**
 * City name to pinyin mapping for Qunar URLs
 * Using pinyin format as Qunar has moved away from numeric city IDs
 */
const CITY_PINYIN: Record<string, string> = {
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
  拉萨: 'lasa',
  香格里拉: 'xianggelila',
  西双版纳: 'xishuangbanna',
  张家界: 'zhangjiajie',
  黄山: 'huangshan',
  九寨沟: 'jiuzhaigou',
  洛阳: 'luoyang',
  长沙: 'changsha',
  哈尔滨: 'haerbin',
  沈阳: 'shenyang',
  大连: 'dalian',
  天津: 'tianjin',
};

/**
 * Qunar AI Crawler
 * Extracts travel guides using direct LLM extraction
 */
class QunarAICrawler extends AICrawlerBase {
  constructor() {
    super('qunar', '去哪儿');
  }

  protected getCityId(city: string): string | undefined {
    return CITY_PINYIN[city];
  }

  protected getListPageUrl(city: string, page: number): string {
    const cityPinyin = this.getCityId(city);
    // Use the travelbook/note format which appears to still work
    if (page === 1) {
      return `https://travel.qunar.com/travelbook/note/${cityPinyin}`;
    }
    return `https://travel.qunar.com/travelbook/note/${cityPinyin}?page=${page}`;
  }

  protected getSourceExternalId(url: string): string {
    const match = url.match(/\/youji\/(\d+)/) || url.match(/\/note\/(\d+)/);
    return `qunar_${match?.[1] || Date.now()}`;
  }

  protected getListExtractionInstruction(city: string): string {
    return `
      从去哪儿旅游页面中提取所有游记/攻略的列表。
      目标城市: ${city}
      
      请提取每篇游记的:
      - 标题 (title)
      - 详情页链接URL (url) - 可能是 /youji/数字 或 /note/数字 格式的链接，请返回完整URL
      - 作者名称 (author)
      - 缩略图URL (thumbnail)
      
      只提取游记类内容，忽略酒店、机票等其他链接。
      确保URL是完整的，如果是相对路径请补全为 https://travel.qunar.com 开头的完整URL。
    `;
  }

  protected getDetailExtractionInstruction(): string {
    return `
      从这篇去哪儿游记页面中提取完整信息。
      
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
      2. 图片URL要是高清版本
      3. 数字统计如果带有"万"等单位，请转换为实际数字
    `;
  }
}

// Singleton instance
const qunarCrawler = new QunarAICrawler();

/**
 * Crawl Qunar for travel guides using AI extraction
 *
 * @param city - City name in Chinese (e.g., "北京", "上海")
 * @param options - Crawl options
 * @returns Array of crawl results
 */
export async function crawlQunar(
  city: string,
  options: CrawlOptions & { client?: BrowserClient } = {},
): Promise<CrawlResult[]> {
  const aiOptions: AICrawlOptions = {
    maxPages: options.maxPages || 5,
    maxGuidesPerPage: 10,
  };

  return qunarCrawler.crawl(city, aiOptions);
}

// Export the crawler class for direct use
export { QunarAICrawler };
