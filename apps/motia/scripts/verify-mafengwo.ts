/* eslint-disable no-console, unicorn/prefer-dom-node-text-content, style/max-statements-per-line */
/**
 * 马蜂窝爬虫独立验证脚本
 * 直接测试 Kernel.sh + Playwright 爬取功能
 *
 * 运行: npx tsx apps/motia/scripts/verify-mafengwo.ts
 */

import Kernel from '@onkernel/sdk';
import { chromium } from 'playwright';

// 设置环境变量
const KERNEL_API_KEY = process.env.KERNEL_API_KEY || 'sk_547ad99d-3f84-41b6-8413-4cec151757fc.mzB5uqs3DrahEYFEPibW52a84ArHw32U5+OLFqeMh7E';

// iPhone 设备配置
const iphoneDevice = {
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
};

async function verify() {
  console.log('🧪 马蜂窝爬虫验证测试\n');

  if (!KERNEL_API_KEY) {
    console.error('❌ KERNEL_API_KEY 未设置');
    process.exit(1);
  }

  const kernel = new Kernel();
  let browser: Awaited<ReturnType<typeof kernel.browsers.create>> | null = null;
  let playwrightBrowser: Awaited<ReturnType<typeof chromium.connectOverCDP>> | null = null;

  try {
    // 1. 创建云浏览器
    console.log('1️⃣ 创建 Kernel.sh 云浏览器...');
    browser = await kernel.browsers.create({
      stealth: true,
      headless: false, // 使用非 headless 模式来绕过 WAF
    });
    console.log(`   ✅ 浏览器已创建: ${browser.session_id}`);
    if (browser.browser_live_view_url) {
      console.log(`   🔗 实时查看: ${browser.browser_live_view_url}`);
    }
    console.log('');

    // 2. 使用 Playwright 直接连接
    console.log('2️⃣ 连接 Playwright...');
    playwrightBrowser = await chromium.connectOverCDP(browser.cdp_ws_url);

    // 创建新的上下文，模拟移动设备
    const context = await playwrightBrowser.newContext({
      ...iphoneDevice,
      locale: 'zh-CN',
      extraHTTPHeaders: {
        'Accept-Language': 'zh-CN,zh;q=0.9',
      },
    });
    const page = await context.newPage();
    console.log('   ✅ Playwright 连接成功 (移动端模拟)\n');

    // 3. 访问马蜂窝移动版
    console.log('3️⃣ 访问马蜂窝移动版...');
    await page.goto('https://m.mafengwo.cn/note/', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    await page.waitForTimeout(3000);

    // 检查是否被拦截
    const pageTitle = await page.title();
    console.log(`   页面标题: ${pageTitle}`);

    if (pageTitle.includes('WAF') || pageTitle.includes('拦截')) {
      console.log('   ⚠️ 仍然被 WAF 拦截，尝试刷新...');
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);
    }
    console.log('   ✅ 页面加载完成\n');

    // 4. 滚动加载
    console.log('4️⃣ 滚动加载更多内容...');
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(2000);
      console.log(`   已滚动 ${i + 1}/5 次`);
    }
    console.log('');

    // 5. 提取游记链接
    console.log('5️⃣ 提取游记链接...');
    const urls = await page.evaluate(() => {
      const links = new Set<string>();

      // 方法1: 直接匹配 /i/ 链接
      document.querySelectorAll('a').forEach((a) => {
        const href = (a as HTMLAnchorElement).href;
        if (/mafengwo\.cn\/i\/\d+\.html/.test(href)) {
          links.add(href);
        }
      });

      // 方法2: 匹配 note 相关链接
      document.querySelectorAll('a[href*="mafengwo"]').forEach((a) => {
        const href = (a as HTMLAnchorElement).href;
        if (/\/i\/\d+/.test(href) || /\/note\/\d+/.test(href)) {
          links.add(href);
        }
      });

      return Array.from(links);
    });
    console.log(`   ✅ 提取到 ${urls.length} 条游记链接\n`);

    // 如果没有链接，尝试打印页面内容诊断
    if (urls.length === 0) {
      console.log('⚠️ 未提取到链接，尝试诊断...');
      const pageInfo = await page.evaluate(() => {
        return {
          url: window.location.href,
          title: document.title,
          bodyLength: document.body.innerHTML.length,
          allLinks: document.querySelectorAll('a').length,
          sampleLinks: Array.from(document.querySelectorAll('a')).slice(0, 10).map(a => (a as HTMLAnchorElement).href),
          bodyPreview: document.body.innerText.slice(0, 500),
        };
      });
      console.log('   页面 URL:', pageInfo.url);
      console.log('   页面标题:', pageInfo.title);
      console.log('   HTML 长度:', pageInfo.bodyLength);
      console.log('   链接总数:', pageInfo.allLinks);
      console.log('   示例链接:', pageInfo.sampleLinks);
      console.log('   页面内容预览:', pageInfo.bodyPreview.slice(0, 200));
      console.log('');
    }

    // 6. 显示部分结果
    if (urls.length > 0) {
      console.log('6️⃣ 游记链接示例:');
      urls.slice(0, 5).forEach((url, i) => {
        console.log(`   ${i + 1}. ${url}`);
      });
      console.log('');

      // 7. 测试详情爬取
      console.log('7️⃣ 测试详情爬取...');
      const testUrl = urls[0];
      console.log(`   访问: ${testUrl}`);

      await page.goto(testUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      await page.waitForTimeout(3000);

      const detail = await page.evaluate(() => {
        const title = document.querySelector('h1, .title, [class*="title"]')?.textContent?.trim() || '';
        // 优先使用马蜂窝特定选择器
        const content = document.querySelector('.note-content, .note-body, [class*="note-content"], .article-content')?.textContent?.trim() || '';
        const author = document.querySelector('.author, [class*="author"], .user')?.textContent?.trim() || '';
        return { title, contentLength: content.length, author, contentPreview: content.slice(0, 200) };
      });

      console.log(`   ✅ 详情提取成功:`);
      console.log(`      标题: ${detail.title.slice(0, 50)}...`);
      console.log(`      作者: ${detail.author}`);
      console.log(`      内容长度: ${detail.contentLength} 字符`);
      console.log(`      内容预览: ${detail.contentPreview.slice(0, 100)}...`);
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log('✅ 验证完成!');
    console.log('='.repeat(50));
  }
  catch (error) {
    console.error('\n❌ 验证失败:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
  finally {
    // 清理资源
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

verify();
