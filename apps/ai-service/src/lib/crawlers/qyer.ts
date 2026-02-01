/**
 * Qyer (穷游网) Crawler - AI-powered travel guide extraction
 *
 * Uses Stagehand's AI capabilities (act, extract) to crawl travel guides
 * from Qyer without relying on brittle CSS selectors or regex patterns.
 *
 * Qyer is known for high-quality travel guides and detailed trip reports,
 * especially for international destinations.
 */

import type { AICrawlOptions } from './ai-crawler-base.js';
import type { BrowserClient } from './clients/index.js';
import type { CrawlOptions, CrawlResult } from './index.js';
import { AICrawlerBase } from './ai-crawler-base.js';

// City/destination mapping for Qyer
const CITY_CONFIG: Record<string, { placeId: string; forumId: string; englishName: string }> = {
  北京: { placeId: 'beijing', forumId: '2', englishName: 'Beijing' },
  上海: { placeId: 'shanghai', forumId: '3', englishName: 'Shanghai' },
  杭州: { placeId: 'hangzhou', forumId: '14', englishName: 'Hangzhou' },
  成都: { placeId: 'chengdu', forumId: '15', englishName: 'Chengdu' },
  西安: { placeId: 'xian', forumId: '17', englishName: 'Xian' },
  三亚: { placeId: 'sanya', forumId: '108', englishName: 'Sanya' },
  厦门: { placeId: 'xiamen', forumId: '16', englishName: 'Xiamen' },
  大理: { placeId: 'dali', forumId: '109', englishName: 'Dali' },
  广州: { placeId: 'guangzhou', forumId: '5', englishName: 'Guangzhou' },
  深圳: { placeId: 'shenzhen', forumId: '6', englishName: 'Shenzhen' },
  南京: { placeId: 'nanjing', forumId: '13', englishName: 'Nanjing' },
  苏州: { placeId: 'suzhou', forumId: '12', englishName: 'Suzhou' },
  丽江: { placeId: 'lijiang', forumId: '110', englishName: 'Lijiang' },
  重庆: { placeId: 'chongqing', forumId: '18', englishName: 'Chongqing' },
  武汉: { placeId: 'wuhan', forumId: '19', englishName: 'Wuhan' },
  青岛: { placeId: 'qingdao', forumId: '20', englishName: 'Qingdao' },
  桂林: { placeId: 'guilin', forumId: '21', englishName: 'Guilin' },
  昆明: { placeId: 'kunming', forumId: '22', englishName: 'Kunming' },
  西双版纳: { placeId: 'xishuangbanna', forumId: '111', englishName: 'Xishuangbanna' },
  张家界: { placeId: 'zhangjiajie', forumId: '112', englishName: 'Zhangjiajie' },
  // International destinations (穷游's strength)
  东京: { placeId: 'tokyo', forumId: '42', englishName: 'Tokyo' },
  大阪: { placeId: 'osaka', forumId: '43', englishName: 'Osaka' },
  京都: { placeId: 'kyoto', forumId: '44', englishName: 'Kyoto' },
  首尔: { placeId: 'seoul', forumId: '51', englishName: 'Seoul' },
  曼谷: { placeId: 'bangkok', forumId: '61', englishName: 'Bangkok' },
  新加坡: { placeId: 'singapore', forumId: '71', englishName: 'Singapore' },
  巴黎: { placeId: 'paris', forumId: '81', englishName: 'Paris' },
  伦敦: { placeId: 'london', forumId: '82', englishName: 'London' },
};

/**
 * Qyer AI Crawler
 * Extracts travel guides using Stagehand's AI-powered extraction
 */
class QyerAICrawler extends AICrawlerBase {
  constructor() {
    super('qyer', '穷游');
  }

  protected getCityId(city: string): string | undefined {
    return CITY_CONFIG[city]?.placeId;
  }

  protected getListPageUrl(city: string, page: number): string {
    const config = CITY_CONFIG[city];
    if (!config) {
      // Fallback to search
      return `https://www.qyer.com/search2/topic?keyword=${encodeURIComponent(`${city}攻略`)}`;
    }
    // Use destination page for first request, forum for subsequent pages
    if (page === 1) {
      return `https://place.qyer.com/${config.placeId}/`;
    }
    return `https://bbs.qyer.com/forum-${config.forumId}-${page}.html`;
  }

  protected getSourceExternalId(url: string): string {
    const threadMatch = url.match(/thread-(\d+)/);
    if (threadMatch) {
      return `qyer_thread_${threadMatch[1]}`;
    }
    const travelMatch = url.match(/\/travels\/([a-zA-Z0-9-]+)/);
    if (travelMatch) {
      return `qyer_travel_${travelMatch[1]}`;
    }
    return `qyer_${Date.now()}`;
  }

  protected getListExtractionInstruction(city: string): string {
    return `
      从穷游网页面中提取所有游记/攻略的列表。
      目标城市: ${city}
      
      请提取每篇游记的:
      - 标题 (title) - 游记或帖子的标题
      - 详情页链接URL (url) - 通常是 /thread-数字 或 /travels/ 格式的链接，请返回完整URL
      - 作者名称 (author)
      - 缩略图URL (thumbnail)
      
      只提取游记/攻略类内容，忽略:
      - 公告、通知、版规等管理帖
      - 招募、招聘类帖子
      - 广告、推广内容
      
      确保URL是完整的，如果是相对路径请补全为完整URL。
      对于 //bbs.qyer.com 开头的链接，添加 https: 前缀。
    `;
  }

  protected getDetailExtractionInstruction(): string {
    return `
      从这篇穷游游记/攻略页面中提取完整信息。
      
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
        - 点赞数 (likes) - 穷游用"顶"表示
        - 评论数 (comments) - 回复数
        - 收藏数 (saves)
      - 文章标签 (tags)
      - 提到的目的地/景点名称 (destinations)
      
      注意：
      1. 穷游的游记通常非常详细，内容要完整提取
      2. 如果是精华帖(有精华标记)，请在tags中添加"精华"
      3. 数字统计如果带有"万"等单位，请转换为实际数字
    `;
  }
}

// Singleton instance
const qyerCrawler = new QyerAICrawler();

/**
 * Crawl Qyer for travel guides using AI extraction
 *
 * @param city - City name in Chinese (e.g., "北京", "东京")
 * @param options - Crawl options
 * @returns Array of crawl results
 */
export async function crawlQyer(
  city: string,
  options: CrawlOptions & { client?: BrowserClient } = {},
): Promise<CrawlResult[]> {
  const aiOptions: AICrawlOptions = {
    maxPages: options.maxPages || 3,
    maxGuidesPerPage: 20,
  };

  return qyerCrawler.crawl(city, aiOptions);
}

/**
 * Get all predefined cities from CITY_CONFIG
 */
export function getQyerPredefinedCities(): string[] {
  return Object.keys(CITY_CONFIG);
}

// Export the crawler class for direct use
export { QyerAICrawler };
