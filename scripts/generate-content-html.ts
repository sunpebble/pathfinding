/**
 * Generates rich HTML content for historical guides.
 * Combines plain text content and image URLs into contentHtml.
 */

import { createDb, travelGuides } from '@pathfinding/database';
import { asc } from 'drizzle-orm';
import { applyGuideEnrichment } from '../packages/api/src/services/guide-writer.js';

const BATCH_SIZE = 50;

function generateContentHtml(content: string, imageUrls: string[]): string {
  if (!content || content.trim().length === 0)
    return '';

  let paragraphs = content.split(/\n{2,}/).map(p => p.trim()).filter(p => p.length > 0);

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

    paragraphs = [];
    for (let index = 0; index < sentences.length; index += 3) {
      const group = sentences.slice(index, index + 3).join('');
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
    return paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join('\n');
  }

  const interval = Math.max(1, Math.floor(paragraphs.length / (validImages.length + 1)));
  const parts: string[] = [];
  let imageIndex = 0;

  for (let index = 0; index < paragraphs.length; index++) {
    parts.push(`<p>${escapeHtml(paragraphs[index])}</p>`);

    if (imageIndex < validImages.length && (index + 1) % interval === 0) {
      parts.push(
        `<img src="${escapeHtml(validImages[imageIndex])}" style="max-width:100%;height:auto;border-radius:8px;margin:12px 0;" />`,
      );
      imageIndex++;
    }
  }

  while (imageIndex < validImages.length) {
    parts.push(
      `<img src="${escapeHtml(validImages[imageIndex])}" style="max-width:100%;height:auto;border-radius:8px;margin:12px 0;" />`,
    );
    imageIndex++;
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
  console.warn('Generating mixed-media HTML for historical guides...');

  const db = createDb();
  let offset = 0;
  let totalProcessed = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;

  while (true) {
    const guides = await db
      .select({
        id: travelGuides.id,
        title: travelGuides.title,
        externalId: travelGuides.externalId,
        content: travelGuides.content,
        imageUrls: travelGuides.imageUrls,
        enrichedData: travelGuides.enrichedData,
      })
      .from(travelGuides)
      .orderBy(asc(travelGuides.id))
      .limit(BATCH_SIZE)
      .offset(offset);

    if (guides.length === 0) {
      break;
    }

    for (const guide of guides) {
      totalProcessed++;

      try {
        const enrichedData
          = guide.enrichedData && typeof guide.enrichedData === 'object' && !Array.isArray(guide.enrichedData)
            ? { ...guide.enrichedData as Record<string, unknown> }
            : {};
        const existingHtml = typeof enrichedData.contentHtml === 'string' ? enrichedData.contentHtml : null;

        if (existingHtml && existingHtml.length > 50) {
          totalSkipped++;
          if (totalProcessed % 20 === 0) {
            console.warn(`[${totalProcessed}] skipped guide with existing contentHtml`);
          }
          continue;
        }

        if (!guide.content || guide.content.length < 50) {
          totalSkipped++;
          continue;
        }

        const contentHtml = generateContentHtml(guide.content, Array.isArray(guide.imageUrls) ? guide.imageUrls.filter((url): url is string => typeof url === 'string') : []);
        if (!contentHtml) {
          totalSkipped++;
          continue;
        }

        await applyGuideEnrichment(db as never, guide.id, {
          enrichedData: { ...enrichedData, contentHtml },
        });

        totalUpdated++;
        const imageCount = Array.isArray(guide.imageUrls) ? guide.imageUrls.length : 0;
        console.warn(
          `[${totalProcessed}] generated contentHtml for ${guide.title?.slice(0, 35) || guide.externalId || guide.id} (${imageCount} images)`,
        );
      }
      catch (error) {
        console.error(`[${totalProcessed}] guide ${guide.id} failed:`, error);
      }
    }

    offset += guides.length;
  }

  console.warn('HTML generation complete');
  console.warn(`Processed: ${totalProcessed}`);
  console.warn(`Updated:   ${totalUpdated}`);
  console.warn(`Skipped:   ${totalSkipped}`);
}

main().catch(console.error);
