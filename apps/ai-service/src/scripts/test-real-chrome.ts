#!/usr/bin/env npx tsx
/**
 * Connect to a real Chrome browser via CDP to bypass WAF detection
 *
 * Usage:
 * 1. First, start Chrome with remote debugging:
 *    /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
 *
 * 2. Then run this script:
 *    npx tsx src/scripts/test-real-chrome.ts "https://www.mafengwo.cn/yj/10156/1-0-1.html"
 */

import { spawn } from 'node:child_process';
import { chromium } from 'rebrowser-playwright-core';
import 'dotenv/config';

async function launchRealChrome(): Promise<number> {
  const port = 9222;

  // Check if Chrome is already running with debugging
  try {
    const response = await fetch(`http://127.0.0.1:${port}/json/version`);
    if (response.ok) {
      console.log('✅ Chrome already running with remote debugging');
      return port;
    }
  }
  catch {
    // Chrome not running, need to start it
  }

  console.log('Starting real Chrome with remote debugging...');

  // macOS Chrome path
  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

  // Start Chrome with remote debugging
  const chrome = spawn(chromePath, [
    `--remote-debugging-port=${port}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=/tmp/chrome-debug-profile',
  ], {
    detached: true,
    stdio: 'ignore',
  });

  chrome.unref();

  // Wait for Chrome to start
  console.log('Waiting for Chrome to start...');
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 500));
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) {
        const info = await response.json();
        console.log(`✅ Chrome started: ${info.Browser}`);
        return port;
      }
    }
    catch {
      // Keep waiting
    }
  }

  throw new Error('Failed to start Chrome');
}

async function main() {
  const url = process.argv[2] || 'https://www.mafengwo.cn/yj/10156/1-0-1.html';

  console.log(`Testing with REAL Chrome browser`);
  console.log(`URL: ${url}`);
  console.log('---');

  try {
    const port = await launchRealChrome();

    // Connect to Chrome via CDP
    console.log(`Connecting to Chrome via CDP on port ${port}...`);
    const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);

    console.log('✅ Connected to real Chrome!');

    // Get existing contexts or create new one
    const contexts = browser.contexts();
    const context = contexts.length > 0 ? contexts[0] : await browser.newContext();

    const page = await context.newPage();

    console.log('Navigating to page...');
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    // Wait for content to load
    console.log('Waiting for JavaScript to render...');
    await page.waitForTimeout(5000);

    // Scroll to trigger lazy loading
    console.log('Scrolling to load content...');
    for (let i = 0; i < 3; i++) {
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(1000);
    }

    // Get page content
    const textContent = await page.evaluate(() => document.body?.textContent || '');
    const pageUrl = page.url();

    console.log(`\nFinal URL: ${pageUrl}`);
    console.log(`Text length: ${textContent.length} chars`);
    console.log('\n=== PAGE TEXT CONTENT (first 2000 chars) ===\n');
    console.log(textContent.substring(0, 2000));
    console.log('\n=== END ===\n');

    // Check for block indicators
    const lowerText = textContent.toLowerCase();
    const blockIndicators = ['验证码', 'captcha', '滑动验证', '请完成验证', '安全验证', 'waf拦截', '请求已中断'];
    let blocked = false;
    for (const indicator of blockIndicators) {
      if (lowerText.includes(indicator)) {
        console.log(`❌ Block indicator found: "${indicator}"`);
        blocked = true;
      }
    }

    if (!blocked) {
      // Check for expected content indicators
      const successIndicators = ['游记', '攻略', '旅游', '旅行', '景点'];
      let hasContent = false;
      for (const indicator of successIndicators) {
        if (lowerText.includes(indicator)) {
          hasContent = true;
          console.log(`✅ Found expected content: "${indicator}"`);
          break;
        }
      }
      if (hasContent) {
        console.log('\n🎉 SUCCESS: Page contains expected travel content!');
      }
      else {
        console.log('\n⚠️ Page loaded but no expected travel content found');
      }
    }
    else {
      console.log('\n❌ BLOCKED: WAF or anti-bot detection triggered');
    }

    // Close the page but keep browser running
    await page.close();

    // Disconnect (don't close the browser)
    await browser.close();
    console.log('\n✅ Disconnected from Chrome (browser still running)');
  }
  catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error);
