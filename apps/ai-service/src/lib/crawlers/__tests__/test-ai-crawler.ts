/**
 * Integration test for AI-powered crawlers
 * Run with: pnpm exec tsx src/lib/crawlers/__tests__/test-ai-crawler.ts
 */

import { config } from 'dotenv'; // Load .env file

import { z } from 'zod';
import { AntiDetectionBrowserClient } from '../clients/anti-detection-client.js';

config();

async function testAIExtraction() {
  console.log('🚀 Testing AI Extraction with Kernel.sh...\n');

  const client = new AntiDetectionBrowserClient();

  try {
    await client.init({ headless: true });
    console.log('✅ Browser initialized (Kernel:', `${client.isUsingKernel()})`);

    // Navigate to Qunar search page to find correct city URL
    const searchUrl = 'https://travel.qunar.com/search/destination/hangzhou';
    console.log(`\n📍 Navigating to: ${searchUrl}`);

    await client.navigateTo(searchUrl, { timeout: 30000 });
    console.log('✅ Navigation complete');

    // Wait for page to load
    await new Promise(r => setTimeout(r, 3000));

    // Scroll to load content
    for (let i = 0; i < 3; i++) {
      await client.scroll('down', 500);
      await new Promise(r => setTimeout(r, 500));
    }

    // Get snapshot
    const snapshot = await client.takeSnapshot();
    console.log(`📄 Page content length: ${snapshot.content.length} chars`);
    console.log(`   Final URL: ${snapshot.url}`);

    // Try Direct LLM extraction (bypassing Stagehand)
    console.log('\n🤖 Testing Direct LLM extraction...');

    try {
      const guideSchema = z.object({
        guides: z.array(z.object({
          title: z.string().describe('游记标题'),
          url: z.string().describe('游记链接'),
          author: z.string().nullable().optional().describe('作者名'),
        })),
        cityName: z.string().nullable().optional().describe('当前页面的城市名称'),
      });

      const result = await client.extractWithDirectLLM(
        '从页面中提取旅游攻略/游记列表。提取每篇游记的标题、链接URL和作者。同时提取当前页面显示的城市名称。',
        guideSchema,
      );

      console.log('\n✅ Direct LLM Extraction successful!');
      console.log(`   City: ${result.cityName || 'Unknown'}`);
      console.log(`   Guides found: ${result.guides.length}`);

      if (result.guides.length > 0) {
        console.log('\n📝 First 3 guides:');
        result.guides.slice(0, 3).forEach((g, i) => {
          console.log(`   ${i + 1}. ${g.title}`);
          console.log(`      URL: ${g.url}`);
          console.log(`      Author: ${g.author || 'Unknown'}`);
        });
      }
    }
    catch (extractError) {
      console.error('❌ Direct LLM Extraction failed:', extractError);
    }
  }
  catch (error) {
    console.error('❌ Error:', error);
  }
  finally {
    await client.close();
    console.log('\n🔒 Browser closed');
  }
}

testAIExtraction();
