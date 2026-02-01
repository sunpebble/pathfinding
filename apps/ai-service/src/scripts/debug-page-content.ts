#!/usr/bin/env npx tsx
/**
 * Debug script to check what content is actually being fetched
 */

import { AntiDetectionBrowserClient } from '../lib/crawlers/clients/anti-detection-client.js';
import { createLogger } from '../lib/logger.js';

import 'dotenv/config';

const log = createLogger('debug');

async function main() {
  const url = process.argv[2] || 'https://www.mafengwo.cn/yj/10156/1-0-1.html';
  const headless = !process.argv.includes('--no-headless');

  log.info({ url, headless }, 'Debugging page content');

  const client = new AntiDetectionBrowserClient();

  try {
    await client.init({ headless });

    log.info('Browser initialized, navigating...');
    await client.navigateTo(url, {
      timeout: 60000,
      waitUntil: 'domcontentloaded',
    });

    // Wait for content to load
    log.info('Waiting 5 seconds for JavaScript to render...');
    await new Promise(r => setTimeout(r, 5000));

    // Scroll to trigger lazy loading
    log.info('Scrolling to load content...');
    for (let i = 0; i < 3; i++) {
      await client.scroll('down', 500);
      await new Promise(r => setTimeout(r, 1000));
    }

    // Use client's takeSnapshot method which works for both modes
    log.info('Getting page snapshot...');
    const snapshot = await client.takeSnapshot();

    const textContent = snapshot.content || '';
    const pageUrl = snapshot.url;

    log.info({
      finalUrl: pageUrl,
      textLength: textContent.length,
    }, 'Page content retrieved');

    console.log('\n=== PAGE TEXT CONTENT (first 3000 chars) ===\n');
    console.log(textContent.substring(0, 3000));
    console.log('\n=== END ===\n');

    // Check for common block indicators
    const lowerText = textContent.toLowerCase();
    const blockIndicators = ['验证码', 'captcha', '滑动验证', '请完成验证', '安全验证', '访问验证'];
    let blocked = false;
    for (const indicator of blockIndicators) {
      if (lowerText.includes(indicator)) {
        log.warn({ indicator }, 'Block indicator found!');
        blocked = true;
      }
    }

    if (!blocked) {
      // Check for expected content indicators
      const successIndicators = ['游记', '攻略', '旅游', '旅行'];
      let hasContent = false;
      for (const indicator of successIndicators) {
        if (lowerText.includes(indicator)) {
          hasContent = true;
          break;
        }
      }
      if (hasContent) {
        log.info('SUCCESS: Page contains expected travel content!');
      }
      else {
        log.warn('Page loaded but no expected travel content found');
      }
    }
  }
  catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : undefined;
    log.error({ error: errMsg, stack: errStack }, 'Error debugging page');
    console.error('Full error:', error);
  }
  finally {
    await client.close();
  }
}

main().catch(console.error);
