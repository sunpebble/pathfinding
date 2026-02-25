/* eslint-disable no-console */
/**
 * 马蜂窝爬虫验证脚本
 *
 * 运行: KERNEL_API_KEY="..." npx tsx scripts/verify-mafengwo.ts
 *
 * 可选 AI 提取: 添加 OPENAI_API_KEY, OPENAI_MODEL, OPENAI_BASE_URL
 */

import {
  closeKernelBrowser,
  createKernelBrowser,
  extractGuideUrls,
  extractGuideWithSelectors,
  scrollToLoadMore,
} from "../src/lib/kernel-browser.js";

async function verify() {
  console.log("🧪 马蜂窝爬虫验证测试\n");

  const KERNEL_API_KEY = process.env.KERNEL_API_KEY;
  if (!KERNEL_API_KEY) {
    console.error("❌ KERNEL_API_KEY 未设置");
    process.exit(1);
  }

  let session: Awaited<ReturnType<typeof createKernelBrowser>> | null = null;

  try {
    // 1. 创建云浏览器
    console.log("1️⃣ 创建 Kernel.sh 云浏览器...");
    session = await createKernelBrowser({
      stealth: true,
      headless: false,
    });
    console.log(`   ✅ 浏览器已创建: ${session.browser.session_id}`);
    if (session.browser.browser_live_view_url) {
      console.log(`   🔗 实时查看: ${session.browser.browser_live_view_url}`);
    }
    console.log("");

    // 2. 访问马蜂窝移动版
    console.log("2️⃣ 访问马蜂窝移动版...");
    await session.page.goto("https://m.mafengwo.cn/note/", {
      waitUntil: "domcontentloaded",
      timeoutMs: 30000,
    });
    await session.page.waitForTimeout(5000);

    const pageTitle = await session.page.evaluate(() => document.title);
    console.log(`   页面标题: ${pageTitle}`);
    console.log("   ✅ 页面加载完成\n");

    // 3. 滚动加载
    console.log("3️⃣ 滚动加载更多内容...");
    await scrollToLoadMore(session.page, 3, 2000);
    console.log("");

    // 4. 提取游记链接
    console.log("4️⃣ 提取游记链接...");
    const urls = await extractGuideUrls(session.page);
    console.log(`   ✅ 提取到 ${urls.length} 条游记链接\n`);

    if (urls.length === 0) {
      throw new Error("未提取到游记链接");
    }

    // 5. 显示部分结果
    console.log("5️⃣ 游记链接示例:");
    urls.slice(0, 5).forEach((url, i) => {
      console.log(`   ${i + 1}. ${url}`);
    });
    console.log("");

    // 6. 测试详情提取
    console.log("6️⃣ 测试详情提取...");
    const testUrl = urls[0];
    console.log(`   访问: ${testUrl}`);

    await session.page.goto(testUrl, {
      waitUntil: "domcontentloaded",
      timeoutMs: 30000,
    });
    await session.page.waitForTimeout(5000);

    console.log("   📄 使用 DOM 选择器提取内容...");
    const data = await extractGuideWithSelectors(session.page);

    console.log(`   ✅ 提取成功:`);
    console.log(`      标题: ${data.title.slice(0, 50)}...`);
    console.log(`      作者: ${data.author || "未知"}`);
    console.log(`      浏览: ${data.views || "未知"}`);
    console.log(`      内容长度: ${data.content.length} 字符`);
    console.log(`      图片数: ${data.images.length}`);
    console.log(`\n   📝 内容预览:`);
    console.log(`      ${data.content.slice(0, 300)}...`);

    console.log(`\n${"=".repeat(50)}`);
    console.log("✅ 验证完成!");
    console.log("=".repeat(50));
  } catch (error) {
    console.error(
      "\n❌ 验证失败:",
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  } finally {
    console.log("\n🧹 清理资源...");
    if (session) {
      await closeKernelBrowser(session);
    }
    console.log("   ✅ 资源已释放");
  }
}

verify();
