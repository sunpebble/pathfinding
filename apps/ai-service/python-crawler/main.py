"""
Main Crawler Script with AI Service Integration
Crawls travel guides from multiple platforms and sends to AI service for
cleaning and storage in Convex
"""

import asyncio
import os
import json
import aiohttp
from typing import Optional
from crawlers import crawl_platform, crawl_all_platforms, CrawlResult

# AI Service configuration
AI_SERVICE_URL = os.getenv("AI_SERVICE_URL", "http://localhost:3001")


async def send_to_ai_service(guides: list[CrawlResult], platform: str, city: str) -> dict:
    """
    Send crawled guides to AI service for cleaning and storage.
    The AI service will use LLM to clean content and save to Convex.
    """
    # Convert CrawlResult objects to dicts
    guides_data = []
    for guide in guides:
        guide_dict = {
            "sourceExternalId": guide.source_external_id,
            "sourceUrl": guide.source_url,
            "title": guide.title,
            "content": guide.content,
            "authorName": guide.author_name,
            "coverImageUrl": guide.cover_image_url,
            "imageUrls": guide.image_urls or [],
            "destinations": guide.destinations or [],
            "tags": guide.tags or [],
            "likesCount": guide.likes_count,
            "savesCount": guide.saves_count,
            "commentsCount": guide.comments_count,
            "viewsCount": guide.views_count,
            "qualityScore": guide.quality_score,
        }
        guides_data.append(guide_dict)

    payload = {
        "guides": guides_data,
        "platform": platform,
        "city": city,
    }

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{AI_SERVICE_URL}/api/crawler/process",
                json=payload,
                timeout=aiohttp.ClientTimeout(total=300),  # 5 min timeout
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    return result.get("results", {})
                else:
                    error_text = await response.text()
                    print(f"[AI Service] Error: {response.status} - {error_text}")
                    return {"saved": 0, "failed": len(guides)}
    except Exception as e:
        print(f"[AI Service] Connection error: {e}")
        return {"saved": 0, "failed": len(guides)}


async def crawl_and_store(
    cities: list[str],
    platforms: list[str],
    max_guides_per_city: int = 20,
) -> dict:
    """
    Crawl multiple platforms for multiple cities and send to AI service for processing
    """
    results = {
        "total_crawled": 0,
        "total_saved": 0,
        "total_failed": 0,
        "by_platform": {},
        "by_city": {},
    }

    for city in cities:
        print(f"\n{'='*60}")
        print(f"Crawling {city}")
        print('='*60)

        city_results = {"crawled": 0, "saved": 0}

        for platform in platforms:
            print(f"\n[{platform}] Starting crawl for {city}...")

            try:
                guides = await crawl_platform(platform, city, max_guides_per_city)
                crawled_count = len(guides)

                print(f"[{platform}] Crawled {crawled_count} guides")
                results["total_crawled"] += crawled_count
                city_results["crawled"] += crawled_count

                # Update platform stats
                if platform not in results["by_platform"]:
                    results["by_platform"][platform] = {"crawled": 0, "saved": 0}
                results["by_platform"][platform]["crawled"] += crawled_count

                # Send to AI service for cleaning and storage
                if guides:
                    print(f"[{platform}] Sending to AI service for processing...")
                    save_result = await send_to_ai_service(guides, platform, city)
                    saved = save_result.get("saved", 0)
                    failed = save_result.get("failed", 0)

                    results["total_saved"] += saved
                    results["total_failed"] += failed
                    city_results["saved"] += saved
                    results["by_platform"][platform]["saved"] += saved
                    print(f"[{platform}] Saved {saved}, failed {failed}")

            except Exception as e:
                print(f"[{platform}] Error: {e}")

            # Rate limiting between platforms
            await asyncio.sleep(2)

        results["by_city"][city] = city_results

        # Rate limiting between cities
        await asyncio.sleep(3)

    return results


async def main():
    """Main entry point"""
    import sys

    # Default cities to crawl
    default_cities = ["杭州", "上海", "成都", "西安", "三亚"]

    # Default platforms (skip mafengwo due to WAF)
    default_platforms = ["ctrip", "tongcheng", "xiaohongshu"]

    # Parse arguments
    cities = sys.argv[1].split(",") if len(sys.argv) > 1 else default_cities
    platforms = sys.argv[2].split(",") if len(sys.argv) > 2 else default_platforms
    max_guides = int(sys.argv[3]) if len(sys.argv) > 3 else 20

    print("="*60)
    print("Travel Guide Crawler with AI Service Integration")
    print("="*60)
    print(f"Cities: {', '.join(cities)}")
    print(f"Platforms: {', '.join(platforms)}")
    print(f"Max guides per city: {max_guides}")
    print(f"AI Service URL: {AI_SERVICE_URL}")
    print("="*60)

    results = await crawl_and_store(cities, platforms, max_guides)

    print("\n" + "="*60)
    print("FINAL RESULTS")
    print("="*60)
    print(f"Total crawled: {results['total_crawled']}")
    print(f"Total saved: {results['total_saved']}")
    print(f"Total failed: {results['total_failed']}")

    print("\nBy Platform:")
    for platform, stats in results["by_platform"].items():
        print(f"  {platform}: {stats['crawled']} crawled, {stats['saved']} saved")

    print("\nBy City:")
    for city, stats in results["by_city"].items():
        print(f"  {city}: {stats['crawled']} crawled, {stats['saved']} saved")

    # Save results to file
    with open("crawl_results.json", "w") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print("\nResults saved to crawl_results.json")


if __name__ == "__main__":
    asyncio.run(main())
