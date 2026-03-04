/**
 * 为历史游记生成图文混排 HTML
 * 将纯文本 content + imageUrls 合并为 contentHtml
 */

import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api.js';

const CONVEX_URL = process.env.CONVEX_URL || 'https://convex.kunish.org';
const client = new ConvexHttpClient(CONVEX_URL);

/**
 * 将纯文本+图片列表合成图文混排 HTML
 * 策略：将文本按段落分割，图片均匀插入段落之间
 */
function generateContentHtml(content: string, imageUrls: string[]): string {
  if (!content || content.trim().length === 0)
    return '';

  // 按段落分割（双换行或多换行）
  let paragraphs = content.split(/\n{2,}/).map(p => p.trim()).filter(p => p.length > 0);

  // 如果只有一段（没有换行），按句号分段
  if (paragraphs.length <= 1 && content.length > 200) {
    const sentences: string[] = [];
    let current = '';
    for (const char of content) {
      current += char;
      if ('。！？.!?'.includes(char)) {
        sentences.push(current.trim());
        current = '';
      }
    }
    if (current.trim())
      sentences.push(current.trim());

    // 每 3 句合成一段
    paragraphs = [];
    for (let i = 0; i < sentences.length; i += 3) {
      const group = sentences.slice(i, i + 3).join('');
      if (group)
        paragraphs.push(group);
    }
  }

  if (paragraphs.length === 0) {
    paragraphs = [content];
  }

  const validImages = (imageUrls || []).filter(
    url => url && url.startsWith('http') && !url.includes('avatar') && !url.includes('icon'),
  );

  if (validImages.length === 0) {
    // 无图片，纯文本段落
    return paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join('\n');
  }

  // 计算图片插入间隔
  const interval = Math.max(1, Math.floor(paragraphs.length / (validImages.length + 1)));
  const parts: string[] = [];
  let imgIdx = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    parts.push(`<p>${escapeHtml(paragraphs[i])}</p>`);

    // 在合适位置插入图片
    if (imgIdx < validImages.length && (i + 1) % interval === 0) {
      parts.push(
        `<img src="${escapeHtml(validImages[imgIdx])}" style="max-width:100%;height:auto;border-radius:8px;margin:12px 0;" />`,
      );
      imgIdx++;
    }
  }

  // 剩余未插入的图片追加到末尾
  while (imgIdx < validImages.length) {
    parts.push(
      `<img src="${escapeHtml(validImages[imgIdx])}" style="max-width:100%;height:auto;border-radius:8px;margin:12px 0;" />`,
    );
    imgIdx++;
  }

  return parts.join('\n');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function main() {
  console.warn('🖼️  为历史游记生成图文混排 HTML...');
  console.warn(`Convex: ${CONVEX_URL}\n`);

  let cursor: string | undefined;
  let totalProcessed = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;

  while (true) {
    const result = await client.query(api.travelGuides.listIds, {
      cursor,
      limit: 50,
    });

    if (!result.items || result.items.length === 0)
      break;

    for (const item of result.items) {
      totalProcessed++;

      try {
        const guide = await client.query(api.travelGuides.getById, {
          id: item._id,
        });

        if (!guide) {
          totalSkipped++;
          continue;
        }

        // 跳过已有 contentHtml 的
        if (guide.contentHtml && guide.contentHtml.length > 50) {
          totalSkipped++;
          if (totalProcessed % 20 === 0) {
            console.warn(`⏭️  [${totalProcessed}] 已跳过（已有 contentHtml）`);
          }
          continue;
        }

        if (!guide.content || guide.content.length < 50) {
          totalSkipped++;
          continue;
        }

        const contentHtml = generateContentHtml(guide.content, guide.imageUrls || []);

        if (contentHtml.length > 0) {
          await client.mutation(api.travelGuides.update, {
            id: item._id,
            content: guide.content, // keep existing
          });

          // Use a direct patch for contentHtml since update mutation is limited
          // We'll use the upsert approach
          await client.mutation(api.travelGuides.upsert, {
            // eslint-disable-next-line ts/no-explicit-any
            sourcePlatform: guide.sourcePlatform as any,
            sourceExternalId: guide.sourceExternalId,
            sourceUrl: guide.sourceUrl,
            title: guide.title,
            content: guide.content,
            contentHtml,
            authorName: guide.authorName,
            destinations: guide.destinations || [],
            tags: guide.tags || [],
            likesCount: guide.likesCount,
            savesCount: guide.savesCount,
            commentsCount: guide.commentsCount,
            viewsCount: guide.viewsCount,
            coverImageUrl: guide.coverImageUrl,
            imageUrls: guide.imageUrls || [],
            qualityScore: guide.qualityScore,
          });

          totalUpdated++;
          const imgCount = (guide.imageUrls || []).length;
          console.warn(
            `✅ [${totalProcessed}] ${guide.title?.slice(0, 35) || guide.sourceExternalId} — ${imgCount} 张图片混排`,
          );
        }
        else {
          totalSkipped++;
        }
      }
      catch (err) {
        console.error(`❌ [${totalProcessed}] ${item._id}: ${err}`);
      }
    }

    if (result.isDone)
      break;
    cursor = result.cursor;
  }

  console.warn(`\n🎉 图文混排生成完成！`);
  console.warn(`   总计处理: ${totalProcessed}`);
  console.warn(`   已更新:   ${totalUpdated}`);
  console.warn(`   已跳过:   ${totalSkipped}`);
}

main().catch(console.error);
