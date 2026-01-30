#!/usr/bin/env npx tsx
/**
 * Import Qyer crawl results to Convex
 * 将穷游网爬取结果导入 Convex 数据库
 *
 * Usage:
 *   npx tsx src/scripts/import-to-convex.ts
 *   npx tsx src/scripts/import-to-convex.ts --dir ./crawl-output
 *   npx tsx src/scripts/import-to-convex.ts --batch-size 10
 */

import type { CrawlResult } from '../lib/crawlers/index.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ConvexHttpClient } from 'convex/browser';
// @ts-expect-error - Convex generated files may not exist during type checking
import { api } from '../../../../convex/_generated/api.js';

// Load environment variables
import 'dotenv/config';

// ============================================================
// Configuration
// ============================================================

interface ImportConfig {
  inputDir: string;
  batchSize: number;
  dryRun: boolean;
}

function parseArgs(): ImportConfig {
  const args = process.argv.slice(2);
  const config: ImportConfig = {
    inputDir: './crawl-output',
    batchSize: 10,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dir' && args[i + 1]) {
      config.inputDir = args[i + 1];
      i++;
    } else if (arg === '--batch-size' && args[i + 1]) {
      config.batchSize = Number.parseInt(args[i + 1], 10);
      i++;
    } else if (arg === '--dry-run') {
      config.dryRun = true;
    }
  }

  return config;
}

// ============================================================
// Convex Client
// ============================================================

function createConvexClient(): ConvexHttpClient {
  const convexUrl = process.env.CONVEX_URL;
  if (!convexUrl) {
    throw new Error('CONVEX_URL environment variable is not set');
  }

  console.log(`[Convex] Connecting to: ${convexUrl}`);
  return new ConvexHttpClient(convexUrl);
}

// ============================================================
// Import Logic
// ============================================================

function loadGuidesFromDir(inputDir: string): CrawlResult[] {
  const allGuides: CrawlResult[] = [];

  if (!fs.existsSync(inputDir)) {
    throw new Error(`Input directory not found: ${inputDir}`);
  }

  const files = fs
    .readdirSync(inputDir)
    .filter((f) => f.startsWith('guides_') && f.endsWith('.json'));

  console.log(`[Load] Found ${files.length} guide files`);

  for (const file of files) {
    try {
      const data = fs.readFileSync(path.join(inputDir, file), 'utf-8');
      const guides = JSON.parse(data) as CrawlResult[];
      allGuides.push(...guides);
    } catch (error) {
      console.warn(`[Load] Failed to load ${file}:`, error);
    }
  }

  return allGuides;
}

function transformToConvexFormat(guide: CrawlResult) {
  return {
    sourcePlatform: 'qyer' as const,
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
  };
}

async function importToConvex(
  client: ConvexHttpClient,
  guides: CrawlResult[],
  config: ImportConfig
): Promise<{ imported: number; skipped: number; errors: number }> {
  const stats = { imported: 0, skipped: 0, errors: 0 };
  const batchSize = config.batchSize;

  console.log(`[Import] Starting import of ${guides.length} guides...`);
  console.log(`[Import] Batch size: ${batchSize}`);

  for (let i = 0; i < guides.length; i += batchSize) {
    const batch = guides.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(guides.length / batchSize);

    console.log(`[Import] Processing batch ${batchNum}/${totalBatches}...`);

    for (const guide of batch) {
      try {
        const convexData = transformToConvexFormat(guide);

        if (config.dryRun) {
          console.log(
            `  [DRY RUN] Would upsert: ${guide.title?.substring(0, 40)}...`
          );
          stats.imported++;
          continue;
        }

        await client.mutation(api.travelGuides.upsert, convexData);
        stats.imported++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(
          `  [Error] Failed to import ${guide.sourceExternalId}: ${errorMsg}`
        );
        stats.errors++;
      }
    }

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < guides.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return stats;
}

// ============================================================
// Main
// ============================================================

async function main(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log(
    '║       穷游网爬取结果导入 Convex                             ║'
  );
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log();

  const config = parseArgs();

  console.log('配置:');
  console.log(`  - 输入目录: ${config.inputDir}`);
  console.log(`  - 批量大小: ${config.batchSize}`);
  console.log(`  - 干运行: ${config.dryRun ? '是' : '否'}`);
  console.log();

  // Load guides
  const guides = loadGuidesFromDir(config.inputDir);
  console.log(`[Load] Loaded ${guides.length} guides total`);
  console.log();

  if (guides.length === 0) {
    console.log('没有找到攻略数据，请先运行爬取脚本');
    return;
  }

  // Connect to Convex
  const client = createConvexClient();

  // Import
  const stats = await importToConvex(client, guides, config);

  // Summary
  console.log();
  console.log('════════════════════════════════════════════════════════════');
  console.log('                      导入完成');
  console.log('════════════════════════════════════════════════════════════');
  console.log();
  console.log('统计:');
  console.log(`  - 成功导入: ${stats.imported} 篇`);
  console.log(`  - 跳过: ${stats.skipped} 篇`);
  console.log(`  - 错误: ${stats.errors} 篇`);
}

main().catch((error) => {
  console.error('导入失败:', error);
  process.exit(1);
});
