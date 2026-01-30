#!/usr/bin/env tsx
/**
 * Login Helper Script
 *
 * Opens a Chrome browser with a persistent profile for manual login.
 * Login sessions are saved and reused by crawlers.
 *
 * Usage:
 *   pnpm --filter ai-service exec tsx src/login-helper.ts [platform]
 *
 * Examples:
 *   pnpm --filter ai-service exec tsx src/login-helper.ts xiaohongshu
 *   pnpm --filter ai-service exec tsx src/login-helper.ts mafengwo
 *   pnpm --filter ai-service exec tsx src/login-helper.ts all
 */

import type { Platform } from './lib/crawlers/session/index.js';
import { homedir } from 'node:os';
import { join } from 'node:path';
import * as readline from 'node:readline';
import { createBrowserClient } from './lib/crawlers/clients/index.js';
import { checkSession } from './lib/crawlers/session/index.js';

/**
 * Default user data directory for persistent Chrome sessions
 */
const DEFAULT_USER_DATA_DIR = join(homedir(), '.pathfinding', 'chrome-profile');

const PLATFORM_URLS: Record<string, { name: string; loginUrl: string }> = {
  xiaohongshu: {
    name: '小红书',
    loginUrl: 'https://www.xiaohongshu.com/explore',
  },
  mafengwo: {
    name: '马蜂窝',
    loginUrl: 'https://www.mafengwo.cn/',
  },
};

function waitForEnter(prompt: string): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(prompt, () => {
      rl.close();
      resolve();
    });
  });
}

async function isLoggedIn(client: any, platform: string): Promise<boolean> {
  try {
    const result = await checkSession(client, platform as Platform);
    return result.isValid;
  } catch {
    return false;
  }
}

async function loginToPlatform(client: any, platform: string): Promise<void> {
  const config = PLATFORM_URLS[platform];
  if (!config) {
    console.error(`Unknown platform: ${platform}`);
    console.log(`Available: ${Object.keys(PLATFORM_URLS).join(', ')}`);
    return;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${config.name} Login`);
  console.log(`${'='.repeat(60)}\n`);

  console.log(`Opening ${config.name}...`);
  await client.navigateTo(config.loginUrl, { timeout: 30000 });
  await sleep(3000);

  const loggedIn = await isLoggedIn(client, platform);
  if (loggedIn) {
    console.log(`\n✅ Already logged in to ${config.name}!`);
    return;
  }

  console.log(`\n🌐 A Chrome browser window should now be visible.`);
  console.log(`   URL: ${config.loginUrl}\n`);
  console.log(`📱 Please complete the login in the browser:`);
  console.log(`   1. Scan QR code with ${config.name} app, OR`);
  console.log(`   2. Enter phone number / password`);
  console.log(`   3. Complete any captcha verification\n`);
  console.log(`💾 Session will be saved to: ${DEFAULT_USER_DATA_DIR}\n`);

  await waitForEnter('Press ENTER after you have completed login...');

  await sleep(1000);
  const finalStatus = await isLoggedIn(client, platform);
  if (finalStatus) {
    console.log(`\n✅ Login successful! Session saved.`);
  } else {
    console.log(
      `\n⚠️  Login may not be complete. Try running the crawler to verify.`
    );
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const platform = args[0]?.toLowerCase() || 'all';

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  Pathfinding Login Helper`);
  console.log(`${'='.repeat(60)}`);
  console.log(`\nThis tool opens Chrome for you to log in to travel sites.`);
  console.log(`Login sessions are saved and reused by crawlers.\n`);
  console.log(`Chrome profile: ${DEFAULT_USER_DATA_DIR}\n`);

  const client = createBrowserClient();

  try {
    console.log(`[Starting Chrome with persistent profile...]\n`);
    await client.init({ persistent: true });

    const platforms =
      platform === 'all' ? Object.keys(PLATFORM_URLS) : [platform];

    for (const p of platforms) {
      await loginToPlatform(client, p);
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`  Done!`);
    console.log(`${'='.repeat(60)}`);
    console.log(`\nYou can now run crawlers:`);
    console.log(
      `  pnpm --filter ai-service exec tsx src/test-crawlers.ts 杭州 xiaohongshu`
    );
    console.log(
      `  pnpm --filter ai-service exec tsx src/test-crawlers.ts 杭州 mafengwo\n`
    );
  } finally {
    await client.close();
  }
}

main().catch(console.error);
