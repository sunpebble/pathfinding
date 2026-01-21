"""
Travel Platform Crawlers using Crawl4AI
Uses Magic Mode and Undetected Browser for anti-bot detection bypass
"""

import asyncio
import re
import json
import os
from dataclasses import dataclass, asdict
from typing import Optional
from urllib.parse import quote
from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig


@dataclass
class CrawlResult:
    """Standardized crawl result matching TypeScript interface"""
    source_external_id: str
    source_url: str
    title: str
    content: str
    author_name: str = ""
    cover_image_url: Optional[str] = None
    image_urls: list[str] = None
    destinations: list[str] = None
    tags: list[str] = None
    likes_count: int = 0
    saves_count: int = 0
    comments_count: int = 0
    views_count: int = 0
    quality_score: int = 50

    def __post_init__(self):
        if self.image_urls is None:
            self.image_urls = []
        if self.destinations is None:
            self.destinations = []
        if self.tags is None:
            self.tags = []

    def to_dict(self) -> dict:
        """Convert to camelCase dict for JSON response"""
        d = asdict(self)
        return {
            "sourceExternalId": d["source_external_id"],
            "sourceUrl": d["source_url"],
            "title": d["title"],
            "content": d["content"],
            "authorName": d["author_name"],
            "coverImageUrl": d["cover_image_url"],
            "imageUrls": d["image_urls"],
            "destinations": d["destinations"],
            "tags": d["tags"],
            "likesCount": d["likes_count"],
            "savesCount": d["saves_count"],
            "commentsCount": d["comments_count"],
            "viewsCount": d["views_count"],
            "qualityScore": d["quality_score"],
        }


# City mappings for different platforms
CTRIP_CITY_IDS = {
    "北京": "Beijing1", "上海": "Shanghai2", "杭州": "Hangzhou14",
    "成都": "Chengdu104", "西安": "Xian7", "三亚": "Sanya61",
    "厦门": "Xiamen21", "大理": "Dali31", "广州": "Guangzhou152",
    "深圳": "Shenzhen26", "南京": "Nanjing9", "苏州": "Suzhou11",
    "丽江": "Lijiang32", "重庆": "Chongqing158", "武汉": "Wuhan145",
}

MAFENGWO_CITY_IDS = {
    "北京": "10065", "上海": "10099", "杭州": "10156", "成都": "10332",
    "西安": "10195", "三亚": "10186", "厦门": "10132", "大理": "10487",
    "广州": "10088", "深圳": "10086", "南京": "10183", "苏州": "10206",
    "丽江": "10460", "重庆": "10208", "武汉": "10140",
}


def get_browser_config() -> BrowserConfig:
    """Create browser config with undetected mode for maximum stealth"""
    return BrowserConfig(
        browser_type="undetected",
        headless=True,
        viewport_width=1920,
        viewport_height=1080,
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        verbose=False,
    )


def get_run_config(delay: float = 3.0) -> CrawlerRunConfig:
    """Create run config with magic mode for anti-detection"""
    return CrawlerRunConfig(
        magic=True,
        simulate_user=True,
        override_navigator=True,
        delay_before_return_html=delay,
        page_timeout=60000,
    )


def extract_tags(text: str) -> list[str]:
    """Extract travel-related tags from text"""
    tags = []
    patterns = [
        (r"美食|餐厅|吃|小吃|探店", "美食"),
        (r"住宿|酒店|民宿|客栈", "住宿"),
        (r"景点|景区|打卡|必去|网红", "景点"),
        (r"交通|出行|高铁|飞机|地铁", "交通"),
        (r"购物|商场|特产", "购物"),
        (r"亲子|带娃|儿童|宝宝", "亲子游"),
        (r"情侣|浪漫|蜜月", "情侣游"),
        (r"自驾|租车", "自驾游"),
        (r"摄影|拍照|出片", "摄影"),
        (r"徒步|登山|户外", "户外"),
    ]
    for pattern, tag in patterns:
        if re.search(pattern, text, re.IGNORECASE):
            tags.append(tag)
    return tags[:5]


def calculate_quality_score(content: str, image_count: int, views: int) -> int:
    """Calculate quality score based on content metrics"""
    score = 50
    if len(content) > 1000:
        score += 10
    if len(content) > 3000:
        score += 10
    if len(content) > 5000:
        score += 5
    score += min(image_count * 2, 15)
    if views > 1000:
        score += 5
    if views > 10000:
        score += 5
    return min(score, 100)


def basic_content_cleanup(content: str) -> str:
    """
    Basic content cleanup - removes obvious navigation and formatting issues.
    Full content cleaning is now done by the AI service using LLM.
    """
    # Remove image markdown links but keep text
    content = re.sub(r'!\[([^\]]*)\]\([^)]+\)', '', content)
    content = re.sub(r'\[([^\]]*)\]\([^)]+\)', r'\1', content)

    # Clean up excessive whitespace
    content = re.sub(r'\n{3,}', '\n\n', content)
    content = re.sub(r' {2,}', ' ', content)

    return content.strip()


async def crawl_ctrip_detail(crawler: AsyncWebCrawler, url: str, guide_id: str, city: str) -> Optional[CrawlResult]:
    """
    Crawl a single Ctrip guide detail page to extract actual content
    """
    run_config = get_run_config(delay=2.0)

    try:
        result = await crawler.arun(url=url, config=run_config)
        if not result.success:
            print(f"[Ctrip] Detail page failed: {guide_id}")
            return None

        html = result.html
        markdown = result.markdown or ""

        # Check for WAF
        if "waf" in html.lower() or "拦截" in html:
            print(f"[Ctrip] WAF detected on detail: {guide_id}")
            return None

        # Extract title from markdown (look for # heading after navigation)
        title_match = re.search(r'^# (.+)$', markdown, re.MULTILINE)
        if title_match:
            title = title_match.group(1).strip()
        else:
            # Fallback to HTML title
            title_match = re.search(r'<title>([^<]+)</title>', html)
            title = title_match.group(1).strip() if title_match else f"{city}旅游攻略"
        # Clean title - remove site suffix
        title = re.sub(r'\s*[-–|_].*携程.*$', '', title).strip()

        # Extract content from markdown - skip navigation section
        # Find the actual content start: after "公告：" or starts with "D1-" or date pattern
        content_start_patterns = [
            r'\n# .+\n',  # Main title
            r'\nD\d+-',    # Day pattern like "D1-"
            r'\n\d{4}\.\d{2}\.\d{2}',  # Date pattern
        ]

        content = markdown
        for pattern in content_start_patterns:
            match = re.search(pattern, markdown)
            if match:
                content = markdown[match.start():]
                break

        # Remove image markdown links but keep text
        content = re.sub(r'!\[([^\]]*)\]\([^)]+\)', '', content)
        content = re.sub(r'\[([^\]]*)\]\([^)]+\)', r'\1', content)

        # Clean up multiple newlines and spaces
        content = re.sub(r'\n{3,}', '\n\n', content)
        content = re.sub(r' {2,}', ' ', content)
        content = content.strip()

        # Skip if content is too short (likely failed extraction)
        if len(content) < 200:
            print(f"[Ctrip] Content too short for {guide_id} ({len(content)} chars), skipping")
            return None

        # Extract author from HTML
        author_match = re.search(r'<a[^>]*class="[^"]*author[^"]*"[^>]*>([^<]+)</a>', html)
        if not author_match:
            # Try finding author name in other patterns
            author_match = re.search(r'"authorName":"([^"]+)"', html)
        author_name = author_match.group(1).strip() if author_match else "携程用户"

        # Extract cover image from og:image meta
        cover_match = re.search(r'<meta[^>]*property="og:image"[^>]*content="([^"]+)"', html)
        if not cover_match:
            cover_match = re.search(r'<meta[^>]*name="og:image"[^>]*content="([^"]+)"', html)
        cover_image_url = cover_match.group(1) if cover_match else None

        # Extract images from HTML - ctrip image CDN
        image_urls = re.findall(r'https://dimg\d+\.c-ctrip\.com/images/[^"\'>\s]+', html)
        image_urls = list(set(image_urls))[:20]  # Limit to 20 images

        # Extract view count
        views_match = re.search(r'(\d+)\s*(?:次浏览|阅读|浏览)', html)
        views_count = int(views_match.group(1)) if views_match else 0

        quality_score = calculate_quality_score(content, len(image_urls), views_count)

        # Clean the content before returning
        content = basic_content_cleanup(content)

        return CrawlResult(
            source_external_id=f"ctrip_{guide_id}",
            source_url=url,
            title=title[:200],
            content=content[:50000],  # Limit content length
            author_name=author_name,
            cover_image_url=cover_image_url,
            image_urls=image_urls,
            destinations=[city],
            tags=extract_tags(title + " " + content[:1000]),
            views_count=views_count,
            quality_score=quality_score,
        )
    except Exception as e:
        print(f"[Ctrip] Error crawling detail {guide_id}: {e}")
        return None


async def crawl_ctrip(city: str, max_guides: int = 50) -> list[CrawlResult]:
    """
    Crawl Ctrip travel guides using Crawl4AI - fetches actual article content
    Uses the new /list URL pattern (old t3-p{page}.html is deprecated)
    """
    results = []
    city_id = CTRIP_CITY_IDS.get(city)
    if not city_id:
        print(f"[Ctrip] City not mapped: {city}")
        return results

    # Create fresh config inline to avoid any state issues
    browser_config = BrowserConfig(
        browser_type="undetected",
        headless=True,
        viewport_width=1920,
        viewport_height=1080,
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        verbose=False,
    )
    run_config = CrawlerRunConfig(
        magic=True,
        simulate_user=True,
        override_navigator=True,
        delay_before_return_html=5.0,
        page_timeout=60000,
    )

    # Collect guide URLs from list page (new URL format)
    guide_urls = []

    async with AsyncWebCrawler(config=browser_config) as crawler:
        # New URL pattern: /travels/{city_id}/list
        url = f"https://you.ctrip.com/travels/{city_id.lower()}/list"
        print(f"[Ctrip] Crawling list page: {url}")

        # Retry logic for flaky anti-bot detection
        for attempt in range(3):
            result = await crawler.arun(url=url, config=run_config)

            if not result.success:
                print(f"[Ctrip] Attempt {attempt+1} failed: {result.error_message}")
                if attempt < 2:
                    await asyncio.sleep(2)
                    continue
                return results

            html = result.html

            # Check for WAF or homepage redirect
            if "waf" in html.lower() or "拦截" in html:
                print("[Ctrip] WAF detected")
                return results

            # Check if redirected to homepage (anti-bot)
            if "酒店预订,机票预订查询,旅游度假" in html and "游记攻略" not in html:
                print(f"[Ctrip] Homepage redirect detected on attempt {attempt+1}, retrying...")
                if attempt < 2:
                    await asyncio.sleep(3)
                    continue
                print("[Ctrip] All attempts redirected to homepage")
                return results

            # Success - break out of retry loop
            break

        # Extract guide IDs: /travels/CityXX/123456.html
        pattern = r'/travels/[A-Za-z]+\d+/(\d+)\.html'
        matches = re.findall(pattern, html, re.IGNORECASE)
        unique_ids = list(set(matches))

        print(f"[Ctrip] Found {len(unique_ids)} guide IDs")

        for guide_id in unique_ids:
            if len(guide_urls) >= max_guides:
                break
            detail_url = f"https://you.ctrip.com/travels/{city_id.lower()}/{guide_id}.html"
            if detail_url not in [u[1] for u in guide_urls]:
                guide_urls.append((guide_id, detail_url))

        # Now crawl each detail page
        print(f"[Ctrip] Fetching {len(guide_urls)} guide detail pages...")

        for i, (guide_id, detail_url) in enumerate(guide_urls[:max_guides]):
            print(f"[Ctrip] Fetching detail {i+1}/{len(guide_urls)}: {guide_id}")

            guide = await crawl_ctrip_detail(crawler, detail_url, guide_id, city)
            if guide:
                results.append(guide)
                print(f"[Ctrip] ✓ Got content: {len(guide.content)} chars")

            # Rate limiting between detail pages
            await asyncio.sleep(1.5)

    print(f"[Ctrip] Total: {len(results)} guides with content")
    return results


async def crawl_mafengwo(city: str, max_guides: int = 50) -> list[CrawlResult]:
    """
    Crawl Mafengwo travel guides using Crawl4AI
    Note: Mafengwo uses Tencent WAF, may still block
    """
    results = []
    city_id = MAFENGWO_CITY_IDS.get(city)
    if not city_id:
        print(f"[Mafengwo] City not mapped: {city}")
        return results

    # Try the note list page which may be less protected
    url = f"https://www.mafengwo.cn/yj/{city_id}/1-0-1.html"
    print(f"[Mafengwo] Crawling: {url}")

    browser_config = get_browser_config()
    run_config = get_run_config(delay=5.0)

    async with AsyncWebCrawler(config=browser_config) as crawler:
        result = await crawler.arun(url=url, config=run_config)

        if not result.success:
            print(f"[Mafengwo] Failed: {result.error_message}")
            return results

        html = result.html

        # Check for WAF/Captcha
        if "captcha" in html.lower() or "WAF拦截" in html or len(html) < 5000:
            print("[Mafengwo] WAF/Captcha detected")
            # Try alternative URL
            alt_url = f"https://www.mafengwo.cn/gonglve/ziyouxing/{city_id}.html"
            print(f"[Mafengwo] Trying alternative: {alt_url}")
            result = await crawler.arun(url=alt_url, config=run_config)
            if result.success:
                html = result.html

        # Extract guide IDs: /i/xxxxx.html or /note/xxxxx.html
        guide_pattern = r'/i/(\d+)\.html'
        note_pattern = r'/note/(\d+)\.html'

        guide_ids = set(re.findall(guide_pattern, html))
        note_ids = set(re.findall(note_pattern, html))

        print(f"[Mafengwo] Found {len(guide_ids)} guides, {len(note_ids)} notes")

        for guide_id in list(guide_ids)[:max_guides]:
            results.append(CrawlResult(
                source_external_id=f"mafengwo_{guide_id}",
                source_url=f"https://www.mafengwo.cn/i/{guide_id}.html",
                title=f"{city}旅游攻略",
                content=f"{city}旅游攻略 - 马蜂窝",
                author_name="马蜂窝用户",
                destinations=[city],
                tags=extract_tags(city),
            ))

        for note_id in list(note_ids)[:max_guides - len(results)]:
            results.append(CrawlResult(
                source_external_id=f"mafengwo_note_{note_id}",
                source_url=f"https://www.mafengwo.cn/note/{note_id}.html",
                title=f"{city}游记",
                content=f"{city}游记 - 马蜂窝",
                author_name="马蜂窝用户",
                destinations=[city],
                tags=extract_tags(city),
            ))

    print(f"[Mafengwo] Total: {len(results)} guides")
    return results


async def crawl_tongcheng_detail(crawler: AsyncWebCrawler, url: str, guide_id: str, city: str) -> Optional[CrawlResult]:
    """
    Crawl a single Tongcheng guide detail page to extract actual content
    """
    run_config = get_run_config(delay=2.0)

    try:
        result = await crawler.arun(url=url, config=run_config)
        if not result.success:
            print(f"[Tongcheng] Detail page failed: {guide_id}")
            return None

        html = result.html

        # Extract title
        title_match = re.search(r'<h1[^>]*>([^<]+)</h1>', html)
        if not title_match:
            title_match = re.search(r'<title>([^<]+)</title>', html)
        title = title_match.group(1).strip() if title_match else f"{city}旅游攻略"
        title = re.sub(r'\s*[-–|_].*同程.*$', '', title).strip()

        # Extract content - try markdown first for cleaner text
        content = result.markdown if result.markdown else ""

        # Skip navigation section - find actual content start
        # Look for patterns that indicate article content
        content_start_patterns = [
            r'\n# .+\n',  # Main title heading
            r'\n## .+\n',  # Section heading
            r'\n!\[',  # First image
            r'\n\d{4}[-年/]\d{1,2}[-月/]',  # Date pattern
            r'\n第[一二三四五六七八九十\d]+天',  # Day pattern like "第一天"
            r'\nD\d+-',  # Day pattern like "D1-"
        ]

        for pattern in content_start_patterns:
            match = re.search(pattern, content)
            if match:
                content = content[match.start():]
                break
        else:
            # Fallback: skip everything before first image or substantial paragraph
            lines = content.split('\n')
            start_idx = 0
            for i, line in enumerate(lines):
                # Skip navigation lines
                if any(x in line for x in ['登录', '注册', '我的订', '首页', '攻略', '门票', '酒店']):
                    start_idx = i + 1
                elif len(line.strip()) > 50 and not line.startswith('[') and not line.startswith('*'):
                    # Found first substantial content line
                    break
            content = '\n'.join(lines[start_idx:])

        # Remove image markdown links but keep text
        content = re.sub(r'!\[([^\]]*)\]\([^)]+\)', '', content)
        content = re.sub(r'\[([^\]]*)\]\([^)]+\)', r'\1', content)

        # Clean up multiple newlines
        content = re.sub(r'\n{3,}', '\n\n', content)
        content = content.strip()

        # If markdown is too short, try extracting from HTML
        if len(content) < 200:
            content_match = re.search(r'<div[^>]*class="[^"]*(?:article|content|detail)[^"]*"[^>]*>(.*?)</div>', html, re.DOTALL)
            if content_match:
                content = re.sub(r'<[^>]+>', ' ', content_match.group(1))
                content = re.sub(r'\s+', ' ', content).strip()

        # Skip if content is too short
        if len(content) < 100:
            print(f"[Tongcheng] Content too short for {guide_id}")
            return None

        # Extract author
        author_match = re.search(r'<span[^>]*class="[^"]*author[^"]*"[^>]*>([^<]+)</span>', html)
        author_name = author_match.group(1).strip() if author_match else "同程用户"

        # Extract images
        image_urls = re.findall(r'<img[^>]*src="(https?://[^"]+)"[^>]*>', html)
        image_urls = [u for u in image_urls if 'ly.com' in u or 'lycdn' in u][:10]

        # Extract view count
        views_match = re.search(r'(\d+)\s*(?:次浏览|阅读|浏览)', html)
        views_count = int(views_match.group(1)) if views_match else 0

        quality_score = calculate_quality_score(content, len(image_urls), views_count)

        # Clean the content before returning
        content = basic_content_cleanup(content)

        return CrawlResult(
            source_external_id=f"tongcheng_{guide_id}",
            source_url=url,
            title=title[:200],
            content=content[:50000],
            author_name=author_name,
            cover_image_url=image_urls[0] if image_urls else None,
            image_urls=image_urls,
            destinations=[city],
            tags=extract_tags(title + " " + content[:500]),
            views_count=views_count,
            quality_score=quality_score,
        )
    except Exception as e:
        print(f"[Tongcheng] Error crawling detail {guide_id}: {e}")
        return None


async def crawl_tongcheng(city: str, max_guides: int = 50) -> list[CrawlResult]:
    """
    Crawl Tongcheng travel guides using Crawl4AI - fetches actual article content
    """
    results = []
    url = "https://www.ly.com/travels/"
    print(f"[Tongcheng] Crawling list page: {url}")

    browser_config = get_browser_config()
    run_config = get_run_config()

    # Collect guide URLs
    guide_urls = []

    async with AsyncWebCrawler(config=browser_config) as crawler:
        result = await crawler.arun(url=url, config=run_config)

        if not result.success:
            print(f"[Tongcheng] Failed: {result.error_message}")
            return results

        html = result.html

        # Extract guide IDs and titles
        pattern = r'/travels/(\d+)\.html'
        matches = re.findall(pattern, html)
        # Sort by ID descending (newer articles have larger IDs)
        unique_ids = sorted(list(set(matches)), key=lambda x: int(x), reverse=True)

        print(f"[Tongcheng] Found {len(unique_ids)} guide IDs")

        # Extract titles from list page
        title_pattern = r'<a[^>]*href="/travels/(\d+)\.html"[^>]*>([^<]+)</a>'
        title_matches = re.findall(title_pattern, html)
        id_to_title = {m[0]: m[1].strip() for m in title_matches}

        for guide_id in unique_ids[:max_guides]:
            detail_url = f"https://www.ly.com/travels/{guide_id}.html"
            guide_urls.append((guide_id, detail_url, id_to_title.get(guide_id, "")))

        # Fetch detail pages
        print(f"[Tongcheng] Fetching {len(guide_urls)} guide detail pages...")

        for i, (guide_id, detail_url, list_title) in enumerate(guide_urls[:max_guides]):
            print(f"[Tongcheng] Fetching detail {i+1}/{len(guide_urls)}: {guide_id}")

            guide = await crawl_tongcheng_detail(crawler, detail_url, guide_id, city)
            if guide:
                # Use title from list page if detail extraction failed
                if guide.title == f"{city}旅游攻略" and list_title:
                    guide.title = list_title[:200]
                results.append(guide)
                print(f"[Tongcheng] ✓ Got content: {len(guide.content)} chars")

            # Rate limiting
            await asyncio.sleep(1.5)

    print(f"[Tongcheng] Total: {len(results)} guides with content")
    return results


async def crawl_xiaohongshu_detail(crawler: AsyncWebCrawler, url: str, note_id: str, city: str) -> Optional[CrawlResult]:
    """
    Crawl a single Xiaohongshu note detail page to extract actual content
    """
    run_config = get_run_config(delay=3.0)

    try:
        result = await crawler.arun(url=url, config=run_config)
        if not result.success:
            print(f"[Xiaohongshu] Detail page failed: {note_id}")
            return None

        html = result.html

        # Check if we got actual content (not login wall)
        if "请登录" in html or len(html) < 3000:
            print(f"[Xiaohongshu] Login wall or empty page: {note_id}")
            return None

        # Extract title from meta or h1
        title_match = re.search(r'<meta[^>]*name="og:title"[^>]*content="([^"]+)"', html)
        if not title_match:
            title_match = re.search(r'<title>([^<]+)</title>', html)
        title = title_match.group(1).strip() if title_match else f"{city}旅行笔记"
        # Clean title
        title = re.sub(r'\s*[-–|].*小红书.*$', '', title).strip()

        # Extract content from note-content or description
        content_match = re.search(r'<div[^>]*class="[^"]*note-content[^"]*"[^>]*>(.*?)</div>', html, re.DOTALL)
        if not content_match:
            content_match = re.search(r'<meta[^>]*name="description"[^>]*content="([^"]+)"', html)

        if content_match:
            content_html = content_match.group(1)
            content = re.sub(r'<[^>]+>', ' ', content_html)
            content = re.sub(r'\s+', ' ', content).strip()
        else:
            # Use markdown from crawl4ai
            content = result.markdown if result.markdown else ""
            # Try to extract just the note content section
            note_section = re.search(r'(?:笔记内容|正文)(.*?)(?:评论|相关推荐|$)', content, re.DOTALL)
            if note_section:
                content = note_section.group(1).strip()

        # Skip if content is too short
        if len(content) < 50:
            print(f"[Xiaohongshu] Content too short for {note_id}")
            return None

        # Extract author
        author_match = re.search(r'<span[^>]*class="[^"]*username[^"]*"[^>]*>([^<]+)</span>', html)
        if not author_match:
            author_match = re.search(r'"nickname":"([^"]+)"', html)
        author_name = author_match.group(1).strip() if author_match else "小红书用户"

        # Extract cover image
        cover_match = re.search(r'<meta[^>]*property="og:image"[^>]*content="([^"]+)"', html)
        cover_image_url = cover_match.group(1) if cover_match else None

        # Extract images
        image_urls = re.findall(r'<img[^>]*src="(https?://[^"]+(?:sns-webpic|ci\.xiaohongshu)[^"]*)"', html)
        image_urls = list(set(image_urls))[:10]

        # Extract engagement metrics
        likes_match = re.search(r'"likedCount":\s*"?(\d+)"?', html)
        likes_count = int(likes_match.group(1)) if likes_match else 0

        collects_match = re.search(r'"collectedCount":\s*"?(\d+)"?', html)
        saves_count = int(collects_match.group(1)) if collects_match else 0

        comments_match = re.search(r'"commentCount":\s*"?(\d+)"?', html)
        comments_count = int(comments_match.group(1)) if comments_match else 0

        quality_score = calculate_quality_score(content, len(image_urls), likes_count)

        return CrawlResult(
            source_external_id=f"xiaohongshu_{note_id}",
            source_url=url,
            title=title[:200],
            content=content[:50000],
            author_name=author_name,
            cover_image_url=cover_image_url,
            image_urls=image_urls,
            destinations=[city],
            tags=extract_tags(title + " " + content[:500]),
            likes_count=likes_count,
            saves_count=saves_count,
            comments_count=comments_count,
            quality_score=quality_score,
        )
    except Exception as e:
        print(f"[Xiaohongshu] Error crawling detail {note_id}: {e}")
        return None


async def crawl_xiaohongshu(city: str, max_guides: int = 50) -> list[CrawlResult]:
    """
    Crawl Xiaohongshu travel notes using Crawl4AI - fetches actual note content
    """
    results = []
    browser_config = get_browser_config()
    run_config = get_run_config(delay=5.0)

    # Collect note URLs
    note_urls = []

    async with AsyncWebCrawler(config=browser_config) as crawler:
        # Try search for city-specific content first (more targeted)
        search_url = f"https://www.xiaohongshu.com/search_result?keyword={quote(city + '旅游攻略')}"
        print(f"[Xiaohongshu] Searching: {city}旅游攻略")

        result = await crawler.arun(url=search_url, config=run_config)
        if result.success:
            pattern = r'/explore/([a-f0-9]{24})'
            matches = re.findall(pattern, result.html)
            unique_ids = list(set(matches))
            print(f"[Xiaohongshu] Found {len(unique_ids)} notes from search")

            for note_id in unique_ids:
                if len(note_urls) >= max_guides:
                    break
                note_url = f"https://www.xiaohongshu.com/explore/{note_id}"
                note_urls.append((note_id, note_url))

        # Also try explore page if we need more
        if len(note_urls) < max_guides:
            explore_url = "https://www.xiaohongshu.com/explore"
            print(f"[Xiaohongshu] Crawling explore page")

            result = await crawler.arun(url=explore_url, config=run_config)
            if result.success:
                pattern = r'/explore/([a-f0-9]{24})'
                matches = re.findall(pattern, result.html)
                unique_ids = list(set(matches))
                print(f"[Xiaohongshu] Found {len(unique_ids)} notes from explore")

                for note_id in unique_ids:
                    if len(note_urls) >= max_guides:
                        break
                    note_url = f"https://www.xiaohongshu.com/explore/{note_id}"
                    if note_url not in [u[1] for u in note_urls]:
                        note_urls.append((note_id, note_url))

        # Now fetch detail pages
        print(f"[Xiaohongshu] Fetching {len(note_urls)} note detail pages...")

        for i, (note_id, note_url) in enumerate(note_urls[:max_guides]):
            print(f"[Xiaohongshu] Fetching detail {i+1}/{len(note_urls)}: {note_id}")

            note = await crawl_xiaohongshu_detail(crawler, note_url, note_id, city)
            if note:
                results.append(note)
                print(f"[Xiaohongshu] ✓ Got content: {len(note.content)} chars")

            # Rate limiting - xiaohongshu is sensitive
            await asyncio.sleep(2.0)

    print(f"[Xiaohongshu] Total: {len(results)} notes with content")
    return results


async def crawl_platform(platform: str, city: str, max_guides: int = 50) -> list[CrawlResult]:
    """Crawl a specific platform for travel guides"""
    crawlers = {
        "ctrip": crawl_ctrip,
        "mafengwo": crawl_mafengwo,
        "tongcheng": crawl_tongcheng,
        "xiaohongshu": crawl_xiaohongshu,
    }

    crawler_fn = crawlers.get(platform)
    if not crawler_fn:
        print(f"[Crawler] Unknown platform: {platform}")
        return []

    try:
        return await crawler_fn(city, max_guides)
    except Exception as e:
        print(f"[Crawler] Error crawling {platform}: {e}")
        return []


async def crawl_all_platforms(city: str, max_guides: int = 20) -> dict[str, list[CrawlResult]]:
    """Crawl all platforms for a city"""
    platforms = ["ctrip", "tongcheng", "xiaohongshu"]  # Skip mafengwo due to WAF

    results = {}
    for platform in platforms:
        print(f"\n{'='*50}")
        print(f"Crawling {platform} for {city}")
        print('='*50)
        results[platform] = await crawl_platform(platform, city, max_guides)
        await asyncio.sleep(2)  # Rate limiting between platforms

    return results


# CLI test
if __name__ == "__main__":
    import sys

    city = sys.argv[1] if len(sys.argv) > 1 else "杭州"
    platform = sys.argv[2] if len(sys.argv) > 2 else None

    if platform:
        print(f"Testing {platform} crawler for {city}")
        results = asyncio.run(crawl_platform(platform, city, max_guides=10))
        print(f"\nResults: {len(results)} guides")
        for r in results[:3]:
            print(f"\n  ID: {r.source_external_id}")
            print(f"  Title: {r.title}")
            print(f"  URL: {r.source_url}")
    else:
        print(f"Testing all platforms for {city}")
        all_results = asyncio.run(crawl_all_platforms(city, max_guides=10))

        print(f"\n{'='*50}")
        print("Summary")
        print('='*50)
        total = 0
        for platform, results in all_results.items():
            print(f"{platform}: {len(results)} guides")
            total += len(results)
        print(f"Total: {total} guides")
