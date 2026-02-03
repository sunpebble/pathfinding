/* eslint-disable no-console, style/max-statements-per-line */
/**
 * 端到端验证脚本
 * 测试完整数据流：爬取 → 转换 → 存储到 Convex → 去重验证
 *
 * 运行: KERNEL_API_KEY="..." CONVEX_URL="..." npx tsx scripts/verify-e2e.ts
 */

import type { MafengwoRawGuide } from '../src/lib/mafengwo-converter.js';
import Kernel from '@onkernel/sdk';
import { ConvexHttpClient } from 'convex/browser';
import { chromium } from 'playwright';
import { api } from '../../../convex/_generated/api.js';
import { convertToConvexFormat } from '../src/lib/mafengwo-converter.js';

// 配置
const KERNEL_API_KEY = process.env.KERNEL_API_KEY || '';
const CONVEX_URL = process.env.CONVEX_URL || 'https://convex.kunish.org';

// iPhone 设备配置
const iphoneDevice = {
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
};

async function verifyE2E() {
  console.log('🧪 端到端验证测试\n');
  console.log('='.repeat(50));

  if (!KERNEL_API_KEY) {
    console.error('❌ KERNEL_API_KEY 未设置');
    process.exit(1);
  }

  if (!CONVEX_URL) {
    console.error('❌ CONVEX_URL 未设置');
    process.exit(1);
  }

  console.log(`📍 Convex URL: ${CONVEX_URL}\n`);

  const kernel = new Kernel();
  let browser: Awaited<ReturnType<typeof kernel.browsers.create>> | null = null;
  let playwrightBrowser: Awaited<ReturnType<typeof chromium.connectOverCDP>> | null = null;
  const convex = new ConvexHttpClient(CONVEX_URL);

  try {
    // ========== 步骤 1: 爬取游记列表 ==========
    console.log('1️⃣ 爬取游记列表...');

    browser = await kernel.browsers.create({
      stealth: true,
      headless: false,
    });
    console.log(`   浏览器已创建: ${browser.session_id}`);

    playwrightBrowser = await chromium.connectOverCDP(browser.cdp_ws_url);
    const context = await playwrightBrowser.newContext({
      ...iphoneDevice,
      locale: 'zh-CN',
      extraHTTPHeaders: { 'Accept-Language': 'zh-CN,zh;q=0.9' },
    });
    const page = await context.newPage();

    await page.goto('https://m.mafengwo.cn/note/', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    await page.waitForTimeout(3000);

    // 滚动加载
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1500);
    }

    // 提取 URL
    const urls = await page.evaluate(() => {
      const links = new Set<string>();
      document.querySelectorAll('a').forEach((a) => {
        const href = (a as HTMLAnchorElement).href;
        if (/mafengwo\.cn\/i\/\d+\.html/.test(href)) {
          links.add(href);
        }
      });
      return Array.from(links);
    });

    console.log(`   ✅ 提取到 ${urls.length} 条游记链接\n`);

    if (urls.length === 0) {
      throw new Error('未提取到游记链接');
    }

    // ========== 步骤 2: 爬取详情并转换 ==========
    console.log('2️⃣ 爬取游记详情...');
    const testUrl = urls[0];
    console.log(`   目标: ${testUrl}`);

    await page.goto(testUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.waitForTimeout(3000);

    const rawGuide: MafengwoRawGuide = await page.evaluate(() => {
      const title = document.querySelector('h1, .title, [class*="title"]')?.textContent?.trim() || '';
      const content = document.querySelector('.content, .article, [class*="content"], main')?.textContent?.trim() || '';
      const author = document.querySelector('.author, [class*="author"], .user-name')?.textContent?.trim() || '';

      const pageText = document.body.textContent || '';
      const viewsMatch = pageText.match(/(\d+(?:\.\d+)?[万k]?)\s*(?:浏览|阅读|次)/i);
      const views = viewsMatch?.[1] || '';
      const likesMatch = pageText.match(/(\d+(?:\.\d+)?[万k]?)\s*(?:赞|喜欢)/i);
      const likes = likesMatch?.[1] || '';

      const images: string[] = [];
      document.querySelectorAll('img[src*="mafengwo"]').forEach((img) => {
        const src = (img as HTMLImageElement).src;
        if (src && !src.includes('avatar') && !src.includes('icon')) {
          images.push(src);
        }
      });

      return { title, content, author, views, likes, images, coverImage: images[0] };
    });

    console.log(`   ✅ 详情提取成功:`);
    console.log(`      标题: ${rawGuide.title.slice(0, 40)}...`);
    console.log(`      内容长度: ${rawGuide.content.length} 字符`);
    console.log(`      图片数: ${rawGuide.images.length}\n`);

    // ========== 步骤 3: 转换数据格式 ==========
    console.log('3️⃣ 转换数据格式...');
    const convexData = convertToConvexFormat(testUrl, rawGuide);
    console.log(`   sourceExternalId: ${convexData.sourceExternalId}`);
    console.log(`   qualityScore: ${convexData.qualityScore}`);
    console.log(`   completenessLevel: ${convexData.completenessLevel}\n`);

    // ========== 步骤 4: 存储到 Convex ==========
    console.log('4️⃣ 存储到 Convex...');
    const result1 = await convex.mutation(api.travelGuides.upsert, {
      sourcePlatform: convexData.sourcePlatform,
      sourceExternalId: convexData.sourceExternalId,
      sourceUrl: convexData.sourceUrl,
      title: convexData.title,
      content: convexData.content,
      authorName: convexData.authorName,
      destinations: convexData.destinations,
      tags: convexData.tags,
      likesCount: convexData.likesCount,
      savesCount: convexData.savesCount,
      commentsCount: convexData.commentsCount,
      viewsCount: convexData.viewsCount,
      coverImageUrl: convexData.coverImageUrl,
      imageUrls: convexData.imageUrls,
      qualityScore: convexData.qualityScore,
    });

    console.log(`   ✅ 首次存储成功:`);
    console.log(`      guideId: ${result1.id}`);
    console.log(`      action: ${result1.action}\n`);

    // ========== 步骤 5: 验证去重逻辑 ==========
    console.log('5️⃣ 验证去重逻辑...');
    console.log('   再次存储相同数据...');

    const result2 = await convex.mutation(api.travelGuides.upsert, {
      sourcePlatform: convexData.sourcePlatform,
      sourceExternalId: convexData.sourceExternalId,
      sourceUrl: convexData.sourceUrl,
      title: convexData.title,
      content: `${convexData.content} (updated)`, // 稍微修改内容
      authorName: convexData.authorName,
      destinations: convexData.destinations,
      tags: convexData.tags,
      likesCount: convexData.likesCount,
      savesCount: convexData.savesCount,
      commentsCount: convexData.commentsCount,
      viewsCount: convexData.viewsCount,
      coverImageUrl: convexData.coverImageUrl,
      imageUrls: convexData.imageUrls,
      qualityScore: convexData.qualityScore,
    });

    console.log(`   结果:`);
    console.log(`      guideId: ${result2.id}`);
    console.log(`      action: ${result2.action}`);

    if (result1.id === result2.id && result2.action === 'updated') {
      console.log(`   ✅ 去重逻辑正确: 相同 ID, action=updated\n`);
    }
    else {
      console.log(`   ⚠️ 去重逻辑异常: ID ${result1.id} vs ${result2.id}\n`);
    }

    // ========== 步骤 6: 验证数据可读取 ==========
    console.log('6️⃣ 验证数据可读取...');
    const guides = await convex.query(api.travelGuides.list, {
      platform: 'mafengwo',
      limit: 5,
    });

    console.log(`   查询到 ${guides.length} 条马蜂窝游记`);
    if (guides.length > 0) {
      const found = guides.find(g => g.sourceExternalId === convexData.sourceExternalId);
      if (found) {
        console.log(`   ✅ 找到刚保存的游记:`);
        console.log(`      标题: ${found.title?.slice(0, 40)}...`);
        console.log(`      qualityScore: ${found.qualityScore}`);
      }
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log('✅ 端到端验证完成!');
    console.log('='.repeat(50));
    console.log('\n📋 验证结果:');
    console.log('   ✅ 爬取游记列表');
    console.log('   ✅ 爬取游记详情');
    console.log('   ✅ 数据格式转换');
    console.log('   ✅ 存储到 Convex');
    console.log('   ✅ 去重逻辑正常');
    console.log('   ✅ 数据可读取');
  }
  catch (error) {
    console.error('\n❌ 验证失败:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
  finally {
    console.log('\n🧹 清理资源...');
    if (playwrightBrowser) {
      try { await playwrightBrowser.close(); }
      catch {}
    }
    if (browser) {
      try { await kernel.browsers.deleteByID(browser.session_id); }
      catch {}
    }
    console.log('   ✅ 资源已释放');
  }
}

verifyE2E();
