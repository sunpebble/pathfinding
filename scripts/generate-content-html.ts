/* eslint-disable no-console */
import { ConvexHttpClient } from 'convex/browser';
import { marked } from 'marked';
import { api } from '../convex/_generated/api.js';

const CONVEX_URL = process.env.CONVEX_URL || 'https://convex.kunish.org';
const client = new ConvexHttpClient(CONVEX_URL);

async function main() {
  console.log('🔄 开始生成 contentHtml...');
  console.log(`Convex: ${CONVEX_URL}\n`);

  let cursor: string | undefined;
  let totalProcessed = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;

  while (true) {
    const result = await client.query(api.travelGuides.listIds, {
      cursor,
      limit: 50,
    });

    if (!result.items || result.items.length === 0) {
      break;
    }

    for (const item of result.items) {
      totalProcessed++;

      try {
        const guide = await client.query(api.travelGuides.getById, {
          id: item._id,
        });

        if (!guide || !guide.content) {
          totalSkipped++;
          continue;
        }

        // 检查是否需要更新（已有 contentHtml 且内容长度匹配）
        // 这里的逻辑比较简单，实际可能需要更复杂的 hash 校验
        if (guide.contentHtml && guide.contentHtml.length > guide.content.length) {
          totalSkipped++;
          // continue; // 强制重新生成，注释掉 continue
        }

        // 生成 HTML
        const html = await marked.parse(guide.content);

        // 更新
        await client.mutation(api.travelGuides.update, {
          id: item._id,
          contentHtml: html,
        });

        totalUpdated++;
        if (totalUpdated % 20 === 0) {
          console.log(`✅ [${totalProcessed}] 已更新 ${totalUpdated} 条`);
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

  console.log(`\n🎉 处理完成！`);
  console.log(`   总计: ${totalProcessed}`);
  console.log(`   更新: ${totalUpdated}`);
  console.log(`   跳过: ${totalSkipped}`);
}

main().catch(console.error);
