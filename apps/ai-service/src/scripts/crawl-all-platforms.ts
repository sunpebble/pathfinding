#!/usr/bin/env npx tsx
/**
 * 批量爬取所有平台攻略数据
 * Crawl all platforms for travel guides
 *
 * Usage:
 *   npx tsx src/scripts/crawl-all-platforms.ts
 *   npx tsx src/scripts/crawl-all-platforms.ts --platform mafengwo
 *   npx tsx src/scripts/crawl-all-platforms.ts --city 杭州
 *   npx tsx src/scripts/crawl-all-platforms.ts --max-pages 3 --save-to-db
 */

import type { CrawlResult } from '../lib/crawlers/index.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { api } from '@pathfinding/convex-client/api';
import { ConvexHttpClient } from 'convex/browser';
import { crawlPlatform } from '../lib/crawlers/index.js';
import { createLogger } from '../lib/logger.js';

// Load environment variables
import 'dotenv/config';

const log = createLogger('crawl-all');

// ============================================================
// 平台配置 - 城市列表
// ============================================================

const PLATFORM_CITIES: Record<string, string[]> = {
  qunar: [
    '北京',
    '上海',
    '杭州',
    '成都',
    '西安',
    '三亚',
    '厦门',
    '大理',
    '广州',
    '深圳',
    '南京',
    '苏州',
    '丽江',
    '重庆',
    '武汉',
    '青岛',
    '桂林',
    '昆明',
    '拉萨',
    '香格里拉',
    '西双版纳',
    '张家界',
    '黄山',
    '九寨沟',
    '洛阳',
    '长沙',
    '哈尔滨',
    '沈阳',
    '大连',
    '天津',
  ],
  mafengwo: [
    '北京',
    '上海',
    '杭州',
    '成都',
    '西安',
    '三亚',
    '厦门',
    '大理',
    '广州',
    '深圳',
    '南京',
    '苏州',
    '丽江',
    '重庆',
    '武汉',
  ],
  qyer: [
    '北京',
    '上海',
    '杭州',
    '成都',
    '西安',
    '三亚',
    '厦门',
    '大理',
    '广州',
    '深圳',
    '南京',
    '苏州',
    '丽江',
    '重庆',
    '武汉',
    '青岛',
    '桂林',
    '昆明',
    '西双版纳',
    '张家界',
    // 国际城市
    '东京',
    '大阪',
    '京都',
    '首尔',
    '曼谷',
    '新加坡',
  ],
  tongcheng: [
    '北京',
    '上海',
    '杭州',
    '成都',
    '西安',
    '三亚',
    '厦门',
    '大理',
    '广州',
    '深圳',
    '南京',
    '苏州',
    '丽江',
    '重庆',
    '武汉',
    '青岛',
    '桂林',
    '昆明',
    '西双版纳',
    '张家界',
  ],
};

// ============================================================
// 配置解析
// ============================================================

interface CrawlConfig {
  platforms: string[];
  cities: string[] | null; // null = all cities for each platform
  maxPages: number;
  maxGuidesPerPage: number;
  saveToDb: boolean;
  saveToFile: boolean;
  outputDir: string;
  delayBetweenCities: number; // ms
  delayBetweenPlatforms: number; // ms
  batchSize: number; // 每批爬取的城市数
  delayBetweenBatches: number; // 批次间休息时间 ms
  maxRetries: number; // 单个城市最大重试次数
}

function parseArgs(): CrawlConfig {
  const args = process.argv.slice(2);
  const config: CrawlConfig = {
    platforms: Object.keys(PLATFORM_CITIES),
    cities: null,
    maxPages: 2,
    maxGuidesPerPage: 5,
    saveToDb: false,
    saveToFile: true,
    outputDir: './crawl-output',
    delayBetweenCities: 30000, // 增加到 30 秒
    delayBetweenPlatforms: 60000, // 增加到 60 秒
    batchSize: 5, // 每 5 个城市休息一次
    delayBetweenBatches: 120000, // 批次间休息 2 分钟
    maxRetries: 2, // 失败重试 2 次
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--platform' && args[i + 1]) {
      config.platforms = [args[i + 1]];
      i++;
    }
    else if (arg === '--city' && args[i + 1]) {
      config.cities = [args[i + 1]];
      i++;
    }
    else if (arg === '--max-pages' && args[i + 1]) {
      config.maxPages = Number.parseInt(args[i + 1], 10);
      i++;
    }
    else if (arg === '--max-guides' && args[i + 1]) {
      config.maxGuidesPerPage = Number.parseInt(args[i + 1], 10);
      i++;
    }
    else if (arg === '--save-to-db') {
      config.saveToDb = true;
    }
    else if (arg === '--no-file') {
      config.saveToFile = false;
    }
    else if (arg === '--output' && args[i + 1]) {
      config.outputDir = args[i + 1];
      i++;
    }
    else if (arg === '--delay' && args[i + 1]) {
      config.delayBetweenCities = Number.parseInt(args[i + 1], 10) * 1000;
      i++;
    }
    else if (arg === '--batch-size' && args[i + 1]) {
      config.batchSize = Number.parseInt(args[i + 1], 10);
      i++;
    }
    else if (arg === '--batch-delay' && args[i + 1]) {
      config.delayBetweenBatches = Number.parseInt(args[i + 1], 10) * 1000;
      i++;
    }
    else if (arg === '--retries' && args[i + 1]) {
      config.maxRetries = Number.parseInt(args[i + 1], 10);
      i++;
    }
    else if (arg === '--help') {
      printHelp();
      process.exit(0);
    }
  }

  return config;
}

function printHelp(): void {
  console.log(`
批量爬取所有平台攻略数据

用法:
  npx tsx src/scripts/crawl-all-platforms.ts [选项]

选项:
  --platform <name>     只爬取指定平台 (qunar/mafengwo/qyer/tongcheng)
  --city <name>         只爬取指定城市
  --max-pages <n>       每个城市爬取的最大页数 (默认: 2)
  --max-guides <n>      每页爬取的最大攻略数 (默认: 5)
  --save-to-db          保存到 Convex 数据库
  --no-file             不保存到本地文件
  --output <dir>        输出目录 (默认: ./crawl-output)
  --delay <seconds>     城市间延迟秒数 (默认: 30)
  --batch-size <n>      每批爬取城市数 (默认: 5)
  --batch-delay <sec>   批次间休息秒数 (默认: 120)
  --retries <n>         失败重试次数 (默认: 2)
  --help                显示帮助

示例:
  # 爬取所有平台所有城市
  npx tsx src/scripts/crawl-all-platforms.ts

  # 只爬取马蜂窝的杭州
  npx tsx src/scripts/crawl-all-platforms.ts --platform mafengwo --city 杭州

  # 爬取并保存到数据库，增加延迟
  npx tsx src/scripts/crawl-all-platforms.ts --save-to-db --max-pages 3 --delay 60
`);
}

// ============================================================
// Convex 数据库保存
// ============================================================

function createConvexClient(): ConvexHttpClient | null {
  const convexUrl = process.env.CONVEX_URL;
  if (!convexUrl) {
    log.warn('CONVEX_URL not set, database saving disabled');
    return null;
  }
  return new ConvexHttpClient(convexUrl);
}

async function saveToConvex(
  client: ConvexHttpClient,
  platform: string,
  guides: CrawlResult[],
): Promise<{ success: number; errors: number }> {
  const stats = { success: 0, errors: 0 };

  for (const guide of guides) {
    try {
      await client.mutation(api.travelGuides.upsert, {
        sourcePlatform: platform as 'qunar' | 'mafengwo' | 'qyer' | 'tongcheng' | 'ctrip' | 'xiaohongshu',
        sourceExternalId: guide.sourceExternalId,
        sourceUrl: guide.sourceUrl,
        title: guide.title,
        content: guide.content || '',
        authorName: guide.authorName,
        destinations: guide.destinations || [],
        tags: guide.tags || [],
        likesCount: guide.likesCount || 0,
        savesCount: guide.savesCount || 0,
        commentsCount: guide.commentsCount || 0,
        viewsCount: guide.viewsCount || 0,
        coverImageUrl: guide.coverImageUrl,
        imageUrls: guide.imageUrls || [],
        qualityScore: guide.qualityScore || 50,
      });
      stats.success++;
    }
    catch (error) {
      log.error({ error, id: guide.sourceExternalId }, 'Failed to save to Convex');
      stats.errors++;
    }
  }

  return stats;
}

// ============================================================
// 文件保存
// ============================================================

function saveToFile(
  outputDir: string,
  platform: string,
  city: string,
  guides: CrawlResult[],
): void {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filename = `${platform}_${city}_${Date.now()}.json`;
  const filepath = path.join(outputDir, filename);

  fs.writeFileSync(filepath, JSON.stringify(guides, null, 2), 'utf-8');
  log.info({ filepath, count: guides.length }, 'Saved to file');
}

// ============================================================
// 主爬取逻辑
// ============================================================

interface CrawlStats {
  platform: string;
  city: string;
  guidesCount: number;
  savedToDb: number;
  dbErrors: number;
  duration: number;
}

async function crawlCity(
  platform: string,
  city: string,
  config: CrawlConfig,
  convexClient: ConvexHttpClient | null,
): Promise<CrawlStats> {
  const startTime = Date.now();
  const stats: CrawlStats = {
    platform,
    city,
    guidesCount: 0,
    savedToDb: 0,
    dbErrors: 0,
    duration: 0,
  };

  log.info({ platform, city }, '开始爬取');

  let lastError: Error | null = null;

  // 重试逻辑
  for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
    try {
      const results = await crawlPlatform(platform, city, {
        maxPages: config.maxPages,
      });

      // 检查是否成功获取到数据
      if (results.length === 0 && attempt <= config.maxRetries) {
        log.warn({ platform, city, attempt }, '未获取到数据，准备重试...');
        // 重试前等待更长时间
        await sleep(config.delayBetweenCities * 2);
        continue;
      }

      stats.guidesCount = results.length;
      log.info({ platform, city, count: results.length }, '爬取完成');

      if (results.length > 0) {
        // 保存到文件
        if (config.saveToFile) {
          saveToFile(config.outputDir, platform, city, results);
        }

        // 保存到数据库
        if (config.saveToDb && convexClient) {
          const dbStats = await saveToConvex(convexClient, platform, results);
          stats.savedToDb = dbStats.success;
          stats.dbErrors = dbStats.errors;
          log.info({ platform, city, ...dbStats }, '保存到数据库完成');
        }
      }

      // 成功，跳出重试循环
      break;
    }
    catch (error) {
      lastError = error as Error;
      log.error({ platform, city, attempt, error }, '爬取失败');

      if (attempt <= config.maxRetries) {
        log.info({ attempt, maxRetries: config.maxRetries }, `等待 ${config.delayBetweenCities * 2 / 1000} 秒后重试...`);
        await sleep(config.delayBetweenCities * 2);
      }
    }
  }

  if (stats.guidesCount === 0 && lastError) {
    log.error({ platform, city, error: lastError }, '所有重试均失败');
  }

  stats.duration = Date.now() - startTime;
  return stats;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// 主函数
// ============================================================

async function main(): Promise<void> {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           批量爬取所有平台攻略数据                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\n');

  const config = parseArgs();

  // 显示配置
  log.info('配置信息:');
  log.info(`  平台: ${config.platforms.join(', ')}`);
  log.info(`  城市: ${config.cities ? config.cities.join(', ') : '全部'}`);
  log.info(`  每城市最大页数: ${config.maxPages}`);
  log.info(`  保存到数据库: ${config.saveToDb ? '是' : '否'}`);
  log.info(`  保存到文件: ${config.saveToFile ? '是' : '否'}`);
  log.info(`  输出目录: ${config.outputDir}`);
  log.info(`  城市间延迟: ${config.delayBetweenCities / 1000} 秒`);
  log.info(`  批次大小: ${config.batchSize} 个城市`);
  log.info(`  批次间休息: ${config.delayBetweenBatches / 1000} 秒`);
  log.info(`  失败重试次数: ${config.maxRetries}`);
  console.log('\n');

  // 初始化 Convex 客户端
  const convexClient = config.saveToDb ? createConvexClient() : null;

  // 统计
  const allStats: CrawlStats[] = [];
  let totalGuides = 0;
  let totalSavedToDb = 0;
  let totalDbErrors = 0;

  // 遍历平台
  for (const platform of config.platforms) {
    if (!PLATFORM_CITIES[platform]) {
      log.warn({ platform }, '未知平台，跳过');
      continue;
    }

    const cities = config.cities || PLATFORM_CITIES[platform];

    console.log('\n');
    log.info(`${'═'.repeat(60)}`);
    log.info(`开始爬取平台: ${platform.toUpperCase()}`);
    log.info(`城市数量: ${cities.length}`);
    log.info(`${'═'.repeat(60)}`);

    for (let i = 0; i < cities.length; i++) {
      const city = cities[i];

      // 检查城市是否被该平台支持
      if (!PLATFORM_CITIES[platform].includes(city)) {
        log.warn({ platform, city }, '该平台不支持此城市，跳过');
        continue;
      }

      log.info(`\n[${i + 1}/${cities.length}] ${platform} - ${city}`);

      const stats = await crawlCity(platform, city, config, convexClient);
      allStats.push(stats);

      totalGuides += stats.guidesCount;
      totalSavedToDb += stats.savedToDb;
      totalDbErrors += stats.dbErrors;

      // 城市间延迟
      if (i < cities.length - 1) {
        // 批次休息：每爬取 batchSize 个城市后，休息更长时间
        const cityNumber = i + 1;
        if (cityNumber % config.batchSize === 0) {
          log.info(`\n已完成 ${cityNumber} 个城市，休息 ${config.delayBetweenBatches / 1000} 秒防止被封...`);
          await sleep(config.delayBetweenBatches);
        }
        else {
          log.info(`等待 ${config.delayBetweenCities / 1000} 秒后继续...`);
          await sleep(config.delayBetweenCities);
        }
      }
    }

    // 平台间延迟
    const platformIndex = config.platforms.indexOf(platform);
    if (platformIndex < config.platforms.length - 1) {
      log.info(`\n平台 ${platform} 完成，等待 ${config.delayBetweenPlatforms / 1000} 秒后继续下一平台...`);
      await sleep(config.delayBetweenPlatforms);
    }
  }

  // 输出汇总
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                       爬取完成                              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\n');

  // 按平台统计
  const platformStats: Record<string, { guides: number; cities: number }> = {};
  for (const stat of allStats) {
    if (!platformStats[stat.platform]) {
      platformStats[stat.platform] = { guides: 0, cities: 0 };
    }
    platformStats[stat.platform].guides += stat.guidesCount;
    platformStats[stat.platform].cities++;
  }

  log.info('平台统计:');
  for (const [platform, stats] of Object.entries(platformStats)) {
    log.info(`  ${platform}: ${stats.guides} 篇攻略 (${stats.cities} 个城市)`);
  }

  console.log('\n');
  log.info('总计:');
  log.info(`  总攻略数: ${totalGuides} 篇`);
  log.info(`  爬取城市: ${allStats.length} 个`);
  if (config.saveToDb) {
    log.info(`  保存到数据库: ${totalSavedToDb} 篇`);
    log.info(`  数据库错误: ${totalDbErrors} 个`);
  }
  if (config.saveToFile) {
    log.info(`  输出目录: ${config.outputDir}`);
  }

  // 输出详细结果
  if (allStats.length <= 20) {
    console.log('\n');
    log.info('详细结果:');
    console.table(
      allStats.map(s => ({
        平台: s.platform,
        城市: s.city,
        攻略数: s.guidesCount,
        耗时: `${(s.duration / 1000).toFixed(1)}s`,
      })),
    );
  }
}

main().catch((error) => {
  log.error({ error }, '爬取失败');
  process.exit(1);
});
