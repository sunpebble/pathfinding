/**
 * Content Cleaner Module
 * Uses LLM to intelligently clean crawled content by removing ads, navigation,
 * footers, and other irrelevant content while preserving the actual article.
 */

import { createLLM } from './llm/index.js';

export interface CleanedContent {
  title: string;
  content: string;
  summary: string;
  hasAds: boolean;
  originalLength: number;
  cleanedLength: number;
}

export interface RawCrawlData {
  title: string;
  content: string;
  sourceUrl: string;
  platform: string;
}

/**
 * Clean content using LLM to identify and remove irrelevant parts
 * This is more intelligent than regex-based cleaning as it understands context
 */
export async function cleanContentWithLLM(
  rawData: RawCrawlData
): Promise<CleanedContent> {
  const llm = createLLM({ temperature: 0.1 }); // Low temperature for consistent output

  const originalLength = rawData.content.length;

  // For very short content, just do basic cleanup
  if (originalLength < 30) {
    return {
      title: rawData.title,
      content: rawData.content.trim(),
      summary: '',
      hasAds: false,
      originalLength,
      cleanedLength: rawData.content.trim().length,
    };
  }

  // Truncate very long content to fit in context window
  const maxContentLength = 15000;
  const contentToProcess =
    rawData.content.length > maxContentLength
      ? rawData.content.substring(0, maxContentLength) + '\n[内容已截断...]'
      : rawData.content;

  const prompt = `你是一个专业的内容清洗助手。请分析以下从旅行网站爬取的原始内容，执行以下任务：

1. **移除无关内容**：
   - 网站导航、菜单、页眉页脚
   - 广告和推广内容
   - 评论区、用户互动区
   - 相关推荐、猜你喜欢
   - 网站版权信息
   - 登录/注册提示
   - App下载推广
   - 社交分享按钮文本

2. **保留核心内容**：
   - 文章标题
   - 正文内容（旅行经历、攻略、建议）
   - 景点介绍
   - 行程安排
   - 费用信息
   - 实用提示

3. **生成简短摘要**（50字以内）

来源平台：${rawData.platform}
原始标题：${rawData.title}
原始内容：
---
${contentToProcess}
---

请返回JSON格式，包含：
- title: 清洗后的标题（保持原意，去除网站后缀）
- content: 清洗后的正文内容（保留换行格式）
- summary: 50字以内的内容摘要
- hasAds: 是否检测到广告内容（布尔值）

重要：content字段应该只包含实际的旅行文章内容，不要包含任何网站导航、广告或无关文本。

JSON:`;

  try {
    console.log('[ContentCleaner] Invoking LLM for content cleaning...');
    const response = await llm.invoke(prompt);
    console.log('[ContentCleaner] LLM response received');
    const responseText =
      typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);

    console.log('[ContentCleaner] Response text length:', responseText.length);

    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      console.log('[ContentCleaner] JSON parsed successfully');
      const data = JSON.parse(jsonMatch[0]);
      const cleanedContent = data.content?.trim() || rawData.content.trim();

      return {
        title: data.title?.trim() || rawData.title,
        content: cleanedContent,
        summary: data.summary?.trim() || '',
        hasAds: data.hasAds === true,
        originalLength,
        cleanedLength: cleanedContent.length,
      };
    }

    console.log('[ContentCleaner] JSON parsing failed, using fallback');
    // Fallback if JSON parsing fails
    return {
      title: rawData.title,
      content: rawData.content.trim(),
      summary: '',
      hasAds: false,
      originalLength,
      cleanedLength: rawData.content.trim().length,
    };
  } catch (error) {
    console.error('[ContentCleaner] Error:', error);
    // Return original content on error
    return {
      title: rawData.title,
      content: rawData.content.trim(),
      summary: '',
      hasAds: false,
      originalLength,
      cleanedLength: rawData.content.trim().length,
    };
  }
}

/**
 * Batch clean multiple pieces of content
 * Processes sequentially to avoid overwhelming the LLM
 */
export async function batchCleanContent(
  items: RawCrawlData[]
): Promise<CleanedContent[]> {
  const results: CleanedContent[] = [];

  for (const item of items) {
    try {
      const cleaned = await cleanContentWithLLM(item);
      results.push(cleaned);
      // Small delay between requests to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Error cleaning content from ${item.sourceUrl}:`, error);
      // Add original content on error
      results.push({
        title: item.title,
        content: item.content,
        summary: '',
        hasAds: false,
        originalLength: item.content.length,
        cleanedLength: item.content.length,
      });
    }
  }

  return results;
}
