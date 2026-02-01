#!/usr/bin/env npx tsx
/**
 * Test rebrowser-playwright-core to bypass WAF detection
 */

import { chromium } from 'rebrowser-playwright-core';
import 'dotenv/config';

async function main() {
  const url = process.argv[2] || 'https://www.mafengwo.cn/yj/10156/1-0-1.html';
  const headless = !process.argv.includes('--no-headless');

  console.log(`Testing rebrowser-playwright-core`);
  console.log(`URL: ${url}`);
  console.log(`Headless: ${headless}`);
  console.log('---');

  const browser = await chromium.launch({
    headless,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--no-sandbox',
    ],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
  });

  const page = await context.newPage();

  try {
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
  }
  catch (error) {
    console.error('Error:', error);
  }
  finally {
    await browser.close();
  }
}

main().catch(console.error);
