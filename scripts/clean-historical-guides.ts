/* eslint-disable no-console */
/**
 * 历史数据清洗脚本
 * 从 Convex 拉取所有游记，用 content-cleaner 清洗后回写
 */

import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api.js';
import { cleanContent } from '../packages/crawler-types/src/content-cleaner.js';

const CONVEX_URL = process.env.CONVEX_URL || 'https://convex.kunish.org';
const client = new ConvexHttpClient(CONVEX_URL);

async function main() {
  console.log('🧹 开始清洗历史游记数据...');
  console.log(`Convex: ${CONVEX_URL}\n`);

  let cursor: string | undefined;
  let totalProcessed = 0;
  let totalCleaned = 0;
  let totalSkipped = 0;

  // 分页遍历所有游记
  while (true) {
    const result = await client.query(api.travelGuides.listIds, {
      cursor,
      limit: 50,
    });

    if (!result.items || result.items.length === 0) {
      break;
    }

    // 逐条处理
    for (const item of result.items) {
      totalProcessed++;

      try {
        // 获取完整 guide
        const guide = await client.query(api.travelGuides.getById, {
          id: item._id,
        });

        if (!guide || !guide.content) {
          totalSkipped++;
          continue;
        }

        // 清洗内容
        const cleanResult = cleanContent(guide.content, {
          categories: ['ad', 'promotion', 'personal', 'platform', 'copyright', 'boilerplate', 'whitespace'],
          preserveParagraphs: true,
        });

        // 如果清洗后内容有变化，回写
        if (cleanResult.cleanedLength !== cleanResult.originalLength) {
          await client.mutation(api.travelGuides.update, {
            id: item._id,
            content: cleanResult.content,
          });

          totalCleaned++;
          const pct = Math.round((1 - cleanResult.cleanedLength / cleanResult.originalLength) * 100);
          console.log(
            `✅ [${totalProcessed}] ${item.title?.slice(0, 30) || item.sourceExternalId} — 清除 ${pct}% 噪音 (${cleanResult.originalLength} → ${cleanResult.cleanedLength}) [${cleanResult.removedTypes.join(', ')}]`,
          );
        }
        else {
          totalSkipped++;
          if (totalProcessed % 20 === 0) {
            console.log(`⏭️  [${totalProcessed}] 已跳过（无需清洗）`);
          }
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

  console.log(`\n🎉 清洗完成！`);
  console.log(`   总计处理: ${totalProcessed}`);
  console.log(`   已清洗:   ${totalCleaned}`);
  console.log(`   已跳过:   ${totalSkipped}`);
}

main().catch(console.error);
