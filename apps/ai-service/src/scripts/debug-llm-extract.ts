import OpenAI from 'openai';
import { chromium } from 'rebrowser-playwright-core';
/**
 * 调试 LLM 提取问题
 */
import 'dotenv/config';

async function main() {
  const port = 9222;

  console.log('连接 Arc 浏览器...');
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
  const contexts = browser.contexts();
  const context = contexts[0];
  const pages = context.pages();
  const page = pages[0];

  console.log(`当前页面数: ${pages.length}`);
  console.log(`使用页面: ${page.url()}`);

  // 导航到马蜂窝
  const url = 'https://www.mafengwo.cn/yj/10332/1-0-1.html';
  console.log(`\n导航到: ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  // 获取页面内容
  const content = await page.content();
  console.log(`\n页面内容长度: ${content.length} 字节`);

  // 提取文本内容（去除 HTML 标签）
  const textContent = await page.evaluate(() => document.body?.textContent || '');
  console.log(`纯文本长度: ${textContent.length} 字节`);
  console.log('\n=== 页面纯文本前 2000 字符 ===');
  console.log(textContent.substring(0, 2000));

  // 检查是否有游记链接
  const links = await page.evaluate(() => {
    const anchors = document.querySelectorAll('a[href*="/i/"]');
    return Array.from(anchors).slice(0, 10).map(a => ({
      text: a.textContent?.trim().substring(0, 50),
      href: a.getAttribute('href'),
    }));
  });

  console.log('\n=== 找到的游记链接 ===');
  console.log(JSON.stringify(links, null, 2));

  // 测试 LLM 调用
  console.log('\n=== 测试 LLM 提取 ===');
  const openai = new OpenAI({
    apiKey: process.env.STAGEHAND_API_KEY,
    baseURL: process.env.STAGEHAND_BASE_URL || 'https://n.kunish.org/v1',
  });

  const prompt = `从以下网页内容中提取游记列表。

页面 URL: ${url}

请提取每篇游记的:
- title: 标题
- url: 详情页链接 (完整 URL)
- author: 作者名称

返回 JSON 格式: {"guides": [...], "hasMore": true/false}

网页内容:
${textContent.substring(0, 30000)}`;

  try {
    const response = await openai.chat.completions.create({
      model: process.env.STAGEHAND_MODEL || 'gemini-3-pro-high',
      messages: [
        { role: 'system', content: '你是网页数据提取助手。只返回 JSON，不要其他内容。' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
    });

    const result = response.choices[0]?.message?.content;
    console.log('\nLLM 响应:');
    console.log(result);
  }
  catch (error) {
    console.error('LLM 调用失败:', error);
  }

  await browser.close();
  console.log('\n完成');
}

main().catch(console.error);
