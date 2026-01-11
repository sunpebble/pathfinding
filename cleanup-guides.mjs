import { ConvexHttpClient } from 'convex/browser';

const convex = new ConvexHttpClient('https://convex.kunish.org');

async function cleanup() {
  console.log('Fetching guides...');

  // Get all guides
  const guides = await convex.query('travelGuides:list', {});
  console.log(`Total guides: ${guides.length}`);

  // Group by platform + externalId
  const grouped = new Map();
  for (const guide of guides) {
    const key = `${guide.sourcePlatform}:${guide.sourceExternalId}`;
    const existing = grouped.get(key) || [];
    existing.push(guide);
    grouped.set(key, existing);
  }

  // Find duplicates and short content
  let removedCount = 0;
  let shortContentCount = 0;

  for (const [key, group] of grouped) {
    // Sort by content length desc
    group.sort((a, b) => (b.content?.length || 0) - (a.content?.length || 0));

    // Delete duplicates (keep first with longest content)
    for (let i = 1; i < group.length; i++) {
      console.log(`Deleting duplicate: ${group[i].title?.slice(0, 30)}...`);
      await convex.mutation('travelGuides:remove', { id: group[i]._id });
      removedCount++;
    }

    // Delete short content (less than 200 chars)
    const best = group[0];
    if (!best.content || best.content.length < 200) {
      console.log(
        `Deleting short content: ${best.title?.slice(0, 30)}... (${best.content?.length || 0} chars)`
      );
      await convex.mutation('travelGuides:remove', { id: best._id });
      shortContentCount++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Removed ${removedCount} duplicates`);
  console.log(`Removed ${shortContentCount} guides with short content`);
  console.log(`Remaining guides: ${grouped.size - shortContentCount}`);
}

cleanup().catch(console.error);
