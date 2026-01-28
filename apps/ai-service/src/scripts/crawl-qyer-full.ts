#!/usr/bin/env npx tsx
/**
 * Full Site Qyer Crawler
 * 穷游网全站攻略爬取脚本
 *
 * Usage:
 *   npx tsx src/scripts/crawl-qyer-full.ts
 *   npx tsx src/scripts/crawl-qyer-full.ts --resume  # Resume from checkpoint
 *   npx tsx src/scripts/crawl-qyer-full.ts --max-destinations 50
 *   npx tsx src/scripts/crawl-qyer-full.ts --max-pages 20
 */

import type { CrawlResult } from '../lib/crawlers/index.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { closeBrowser } from '../lib/crawlers/browser.js';
import { crawlQyer, discoverAllDestinations } from '../lib/crawlers/qyer.js';

// ============================================================
// Configuration
// ============================================================

interface CrawlConfig {
  maxDestinations: number;
  maxPagesPerDestination: number;
  outputDir: string;
  resume: boolean;
}

function parseArgs(): CrawlConfig {
  const args = process.argv.slice(2);
  const config: CrawlConfig = {
    maxDestinations: 1000, // Default: crawl up to 1000 destinations
    maxPagesPerDestination: 30, // Default: 30 pages per destination
    outputDir: './crawl-output',
    resume: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--resume') {
      config.resume = true;
    } else if (arg === '--max-destinations' && args[i + 1]) {
      config.maxDestinations = Number.parseInt(args[i + 1], 10);
      i++;
    } else if (arg === '--max-pages' && args[i + 1]) {
      config.maxPagesPerDestination = Number.parseInt(args[i + 1], 10);
      i++;
    } else if (arg === '--output' && args[i + 1]) {
      config.outputDir = args[i + 1];
      i++;
    }
  }

  return config;
}

// ============================================================
// State Management (for resume support)
// ============================================================

interface CrawlState {
  startedAt: string;
  lastUpdated: string;
  completedDestinations: string[];
  pendingDestinations: string[];
  totalGuides: number;
  errors: { destination: string; error: string }[];
}

function getStatePath(outputDir: string): string {
  return path.join(outputDir, 'crawl-state.json');
}

function loadState(outputDir: string): CrawlState | null {
  const statePath = getStatePath(outputDir);
  if (fs.existsSync(statePath)) {
    try {
      const data = fs.readFileSync(statePath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  return null;
}

function saveState(outputDir: string, state: CrawlState): void {
  const statePath = getStatePath(outputDir);
  state.lastUpdated = new Date().toISOString();
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8');
}

function initState(destinations: string[]): CrawlState {
  return {
    startedAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    completedDestinations: [],
    pendingDestinations: [...destinations],
    totalGuides: 0,
    errors: [],
  };
}

// ============================================================
// Output Management
// ============================================================

function ensureOutputDir(outputDir: string): void {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
}

function saveDestinationGuides(
  outputDir: string,
  destination: string,
  guides: CrawlResult[]
): void {
  const safeDestName = destination.replace(/[/\\?%*:|"<>]/g, '_');
  const filePath = path.join(outputDir, `guides_${safeDestName}.json`);
  fs.writeFileSync(filePath, JSON.stringify(guides, null, 2), 'utf-8');
}

function loadExistingGuides(outputDir: string): CrawlResult[] {
  const allGuides: CrawlResult[] = [];
  if (!fs.existsSync(outputDir)) return allGuides;

  const files = fs
    .readdirSync(outputDir)
    .filter((f) => f.startsWith('guides_') && f.endsWith('.json'));
  for (const file of files) {
    try {
      const data = fs.readFileSync(path.join(outputDir, file), 'utf-8');
      const guides = JSON.parse(data) as CrawlResult[];
      allGuides.push(...guides);
    } catch {
      // Skip invalid files
    }
  }

  return allGuides;
}

// ============================================================
// Main Crawl Logic
// ============================================================

async function crawlFullSite(config: CrawlConfig): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log(
    '║       穷游网 (Qyer) 全站攻略爬取                            ║'
  );
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log();
  console.log(`配置:`);
  console.log(`  - 最大目的地数量: ${config.maxDestinations}`);
  console.log(`  - 每个目的地最大页数: ${config.maxPagesPerDestination}`);
  console.log(`  - 输出目录: ${config.outputDir}`);
  console.log(`  - 断点续爬: ${config.resume ? '是' : '否'}`);
  console.log();

  ensureOutputDir(config.outputDir);

  // Step 1: Discover or load destinations
  let state: CrawlState | undefined;
  let destinations: string[] = [];

  if (config.resume) {
    const existingState = loadState(config.outputDir);
    if (existingState && existingState.pendingDestinations.length > 0) {
      console.log(`[续爬] 发现之前的爬取状态`);
      console.log(
        `  - 已完成: ${existingState.completedDestinations.length} 个目的地`
      );
      console.log(
        `  - 待爬取: ${existingState.pendingDestinations.length} 个目的地`
      );
      console.log(`  - 已爬取攻略: ${existingState.totalGuides} 篇`);
      console.log();
      state = existingState;
      destinations = existingState.pendingDestinations;
    } else {
      console.log(`[续爬] 未发现有效的爬取状态，将重新开始`);
      config.resume = false;
    }
  }

  if (!config.resume || !state) {
    console.log('[发现] 正在发现所有目的地...');
    const discoveredDests = await discoverAllDestinations();
    destinations = discoveredDests.map((d) => d.name);
    console.log(`[发现] 共发现 ${destinations.length} 个目的地`);
    console.log();

    // Apply limit
    destinations = destinations.slice(0, config.maxDestinations);
    state = initState(destinations);
  }

  // Step 2: Crawl each destination
  const totalDests = destinations.length;
  const seenGuideIds = new Set<string>();

  // If resuming, load existing guide IDs to avoid duplicates
  if (config.resume) {
    const existingGuides = loadExistingGuides(config.outputDir);
    for (const guide of existingGuides) {
      seenGuideIds.add(guide.sourceExternalId);
    }
    console.log(`[续爬] 已加载 ${seenGuideIds.size} 个已爬取的攻略ID`);
  }

  console.log('────────────────────────────────────────────────────────────');
  console.log('[爬取] 开始爬取各目的地攻略');
  console.log('────────────────────────────────────────────────────────────');
  console.log();

  for (let i = 0; i < destinations.length; i++) {
    const destination = destinations[i];
    const progress = `[${i + 1}/${totalDests}]`;

    console.log(`${progress} 正在爬取: ${destination}`);

    try {
      // Crawl the destination
      const guides = await crawlQyer(destination, {
        maxPages: config.maxPagesPerDestination,
      });

      // Filter out duplicates
      const newGuides = guides.filter(
        (g) => !seenGuideIds.has(g.sourceExternalId)
      );
      for (const guide of newGuides) {
        seenGuideIds.add(guide.sourceExternalId);
      }

      // Save guides for this destination
      if (newGuides.length > 0) {
        saveDestinationGuides(config.outputDir, destination, newGuides);
      }

      // Update state
      state!.completedDestinations.push(destination);
      state!.pendingDestinations = state!.pendingDestinations.filter(
        (d) => d !== destination
      );
      state!.totalGuides += newGuides.length;
      saveState(config.outputDir, state!);

      console.log(
        `${progress} ✓ ${destination}: ${newGuides.length} 篇新攻略 (总计: ${state!.totalGuides})`
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`${progress} ✗ ${destination}: 爬取失败 - ${errorMsg}`);

      // Record error but continue
      state!.errors.push({ destination, error: errorMsg });
      state!.pendingDestinations = state!.pendingDestinations.filter(
        (d) => d !== destination
      );
      saveState(config.outputDir, state!);
    }

    // Rate limiting between destinations
    if (i < destinations.length - 1) {
      console.log(`${progress} 等待 3 秒...`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  // Step 3: Generate summary
  console.log();
  console.log('════════════════════════════════════════════════════════════');
  console.log('                        爬取完成');
  console.log('════════════════════════════════════════════════════════════');
  console.log();
  console.log(`统计:`);
  console.log(`  - 爬取目的地: ${state!.completedDestinations.length} 个`);
  console.log(`  - 爬取攻略: ${state!.totalGuides} 篇`);
  console.log(`  - 错误数量: ${state!.errors.length} 个`);
  console.log(`  - 输出目录: ${config.outputDir}`);

  if (state!.errors.length > 0) {
    console.log();
    console.log(`错误列表:`);
    for (const err of state!.errors.slice(0, 10)) {
      console.log(`  - ${err.destination}: ${err.error}`);
    }
    if (state!.errors.length > 10) {
      console.log(`  ... 及 ${state!.errors.length - 10} 个其他错误`);
    }
  }

  // Save final merged output
  const allGuides = loadExistingGuides(config.outputDir);
  const finalOutputPath = path.join(config.outputDir, 'all_guides.json');
  fs.writeFileSync(
    finalOutputPath,
    JSON.stringify(allGuides, null, 2),
    'utf-8'
  );
  console.log();
  console.log(`所有攻略已合并保存至: ${finalOutputPath}`);
}

// ============================================================
// Entry Point
// ============================================================

async function main(): Promise<void> {
  const config = parseArgs();

  try {
    await crawlFullSite(config);
  } catch (error) {
    console.error('爬取过程发生致命错误:', error);
    process.exit(1);
  } finally {
    // Always close the browser
    await closeBrowser();
  }
}

main();
