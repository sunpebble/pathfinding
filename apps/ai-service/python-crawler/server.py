"""
Crawl4AI Travel Crawler Service
FastAPI server that exposes crawling endpoints with Magic Mode anti-detection
"""

import asyncio
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
from crawlers import crawl_platform, CrawlResult

app = FastAPI(
    title="Crawl4AI Travel Crawler",
    description="Travel content crawler with anti-bot detection bypass",
    version="1.0.0",
)


class CrawlRequest(BaseModel):
    """Request body for crawl endpoint"""
    platform: str
    city: str
    max_guides: int = 50


class CrawlResponse(BaseModel):
    """Response from crawl endpoint"""
    success: bool
    platform: str
    city: str
    count: int
    guides: list[dict]
    error: Optional[str] = None


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "ok", "service": "crawl4ai-crawler"}


@app.post("/crawl", response_model=CrawlResponse)
async def crawl(request: CrawlRequest):
    """
    Crawl a travel platform for guides

    Supported platforms:
    - mafengwo (马蜂窝)
    - tongcheng (同程旅行)
    - xiaohongshu (小红书)

    Uses Crawl4AI Magic Mode for anti-bot detection bypass.
    """
    try:
        results = await crawl_platform(
            platform=request.platform,
            city=request.city,
            max_guides=request.max_guides,
        )

        return CrawlResponse(
            success=True,
            platform=request.platform,
            city=request.city,
            count=len(results),
            guides=[r.to_dict() for r in results],
        )
    except Exception as e:
        return CrawlResponse(
            success=False,
            platform=request.platform,
            city=request.city,
            count=0,
            guides=[],
            error=str(e),
        )


@app.post("/crawl/batch")
async def crawl_batch(platforms: list[str], city: str, max_guides: int = 50):
    """
    Crawl multiple platforms in parallel
    """
    tasks = [
        crawl_platform(platform, city, max_guides)
        for platform in platforms
    ]

    results_by_platform = await asyncio.gather(*tasks, return_exceptions=True)

    response = {}
    for platform, results in zip(platforms, results_by_platform):
        if isinstance(results, Exception):
            response[platform] = {
                "success": False,
                "count": 0,
                "guides": [],
                "error": str(results),
            }
        else:
            response[platform] = {
                "success": True,
                "count": len(results),
                "guides": [r.to_dict() for r in results],
            }

    return {
        "city": city,
        "platforms": response,
        "total_guides": sum(
            r["count"] for r in response.values() if r["success"]
        ),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3003)
