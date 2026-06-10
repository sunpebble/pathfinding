package browser

// ---------------------------------------------------------------------------
// 结果类型 —— 用于反序列化 JS 脚本在浏览器中执行后返回的 JSON
// ---------------------------------------------------------------------------

// GuideURLResult — 游记列表页提取结果
type GuideURLResult struct {
	URLs []string `json:"urls"`
}

// GuideDetailResult — 游记详情页提取结果
type GuideDetailResult struct {
	Title       string   `json:"title"`
	Content     string   `json:"content"`
	ContentHTML string   `json:"contentHtml"`
	Author      string   `json:"author"`
	Views       string   `json:"views"`
	Likes       string   `json:"likes"`
	CoverImage  string   `json:"coverImage"`
	Images      []string `json:"images"`
	// PublishedAt 是页面提取的发布日期原始字符串（如 "2023.5.20"），页面无此信息时为空。
	PublishedAt string `json:"publishedAt"`
}

// DestinationResult — 目的地页面提取结果
type DestinationResult struct {
	MddID            string   `json:"mddId"`
	Name             string   `json:"name"`
	NameEn           string   `json:"nameEn"`
	Description      string   `json:"description"`
	CoverImage       string   `json:"coverImage"`
	Images           []string `json:"images"`
	BestTravelTime   string   `json:"bestTravelTime"`
	TravelNotesCount int      `json:"travelNotesCount"`
	PoisCount        int      `json:"poisCount"`
}

// POIListResult — POI 列表提取结果
type POIListResult struct {
	POIs []POIItem `json:"pois"`
}

// POIItem — 单个 POI 条目
type POIItem struct {
	Name     string `json:"name"`
	URL      string `json:"url"`
	Rating   string `json:"rating"`
	Category string `json:"category"`
	Image    string `json:"image"`
}

// GuideListResult — 攻略列表提取结果
type GuideListResult struct {
	Guides []GuideItem `json:"guides"`
}

// GuideItem — 单个攻略条目
type GuideItem struct {
	Title  string `json:"title"`
	URL    string `json:"url"`
	Author string `json:"author"`
	Views  string `json:"views"`
}

// QAListResult — 问答列表提取结果
type QAListResult struct {
	Questions []QAItem `json:"questions"`
}

// QAItem — 单个问答条目
type QAItem struct {
	Title       string `json:"title"`
	URL         string `json:"url"`
	AnswerCount int    `json:"answerCount"`
}

// RankingResult — 排行榜提取结果
type RankingResult struct {
	Items []RankingItem `json:"items"`
}

// RankingItem — 单个排行条目
type RankingItem struct {
	Rank     int    `json:"rank"`
	Name     string `json:"name"`
	URL      string `json:"url"`
	Score    string `json:"score"`
	Category string `json:"category"`
}

// ---------------------------------------------------------------------------
// JavaScript 提取脚本 —— 通过 chromedp 在浏览器环境中执行，返回结构化 JSON
// ---------------------------------------------------------------------------

// JSExtractGuideURLs — 从游记列表页提取所有游记链接（匹配 /i/数字.html）
const JSExtractGuideURLs = `(() => {
    const links = new Set();
    document.querySelectorAll('a[href*="/i/"]').forEach(a => {
        const href = a.href;
        if (/\/i\/\d+\.html/.test(href)) links.add(href);
    });
    return { urls: Array.from(links) };
})()`

// JSExtractGuideDetail — 从游记详情页提取标题、正文、作者、浏览量等信息
const JSExtractGuideDetail = `(() => {
    // 标题：优先 og:title，其次 document.title
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const title = ogTitle ? ogTitle.content : document.title;

    // 作者
    const authorEl = document.querySelector('.author-name, .user_name a, .name a, .headinfo .name, [class*="author"] a');
    const author = authorEl ? authorEl.textContent.trim() : '';

    // 浏览量
    const viewsEl = document.querySelector('.view_count, .num_view, .count_view, [class*="view"] em, [class*="read"]');
    const views = viewsEl ? viewsEl.textContent.trim().replace(/[^0-9.万k]/gi, '') : '';

    // 点赞数
    const likesEl = document.querySelector('.ding_count, .num_ding, .count_ding, [class*="like"] em, [class*="zan"] em');
    const likes = likesEl ? likesEl.textContent.trim().replace(/[^0-9.万k]/gi, '') : '';

    // 封面图：优先 og:image
    const ogImage = document.querySelector('meta[property="og:image"]');
    const coverImage = ogImage ? ogImage.content : '';

    // 发布时间：优先时间元素，其次正文「YYYY.MM.DD发布」模式；页面无则留空
    let publishedAt = '';
    const timeEl = document.querySelector('.vc_time, .time, .date, time, [class*="publish"]');
    if (timeEl) {
        const m = timeEl.textContent.match(/\d{4}[-./]\d{1,2}[-./]\d{1,2}/);
        if (m) publishedAt = m[0];
    }
    if (!publishedAt) {
        const m = document.body.innerText.match(/(\d{4}[-./]\d{1,2}[-./]\d{1,2})\s*发布/);
        if (m) publishedAt = m[1];
    }

    // 正文容器
    const contentContainer = document.querySelector(
        '.chapter-container, .note-content, ._j_content, .post_content, .rich_text_content, #_j_note_content'
    );

    let content = '';
    let contentHtml = '';
    const images = [];

    if (contentContainer) {
        // 深拷贝后清理无关元素
        const clone = contentContainer.cloneNode(true);

        // 移除脚本、样式、版权、推荐、广告等干扰元素
        const removeSelectors = [
            'script', 'style', 'iframe',
            '.copyright', '.copy_right', '[class*="copyright"]',
            '.recommend', '.rec_wrap', '[class*="recommend"]',
            '.ad_container', '.ad-container', '[class*="ad_"]', '[class*="ad-"]', '[id*="ad_"]',
            '.share_wrap', '.share-wrap', '[class*="share"]',
            '.comment_list', '.comment-list', '[class*="comment"]',
            '.related', '[class*="related"]',
            '.footer', '[class*="footer"]',
            '.sidebar', '[class*="sidebar"]',
            'nav', '.nav', '[class*="nav"]'
        ];
        removeSelectors.forEach(sel => {
            clone.querySelectorAll(sel).forEach(el => el.remove());
        });

        contentHtml = clone.innerHTML.trim();
        content = clone.textContent.trim().replace(/\s+/g, ' ');

        // 提取所有图片
        contentContainer.querySelectorAll('img[src]').forEach(img => {
            const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-original') || '';
            if (src && !src.includes('avatar') && !src.includes('icon') && !src.includes('logo')) {
                images.push(src);
            }
        });
    }

    return {
        title:       title,
        content:     content,
        contentHtml: contentHtml,
        author:      author,
        views:       views,
        likes:       likes,
        coverImage:  coverImage,
        images:      images,
        publishedAt: publishedAt
    };
})()`

// JSExtractDestination — 从目的地页面提取目的地基本信息
const JSExtractDestination = `(() => {
    // 从 URL 中提取目的地 ID（mddId）
    const mddMatch = location.pathname.match(/\/travel-scenic-spot\/mafengwo\/(\d+)/);
    const mddId = mddMatch ? mddMatch[1] : '';

    // 目的地中文名称
    const h1 = document.querySelector('h1, .title-name, .mdd-title');
    const name = h1 ? h1.textContent.trim() : '';

    // 目的地英文名称
    const enEl = document.querySelector('.enName, .en-name, .mdd-en-name, h1 + span, h1 + .sub-title');
    const nameEn = enEl ? enEl.textContent.trim() : '';

    // 目的地描述：优先 og:description，其次页面摘要
    const ogDesc = document.querySelector('meta[property="og:description"], meta[name="description"]');
    const summaryEl = document.querySelector('.summary, .mdd-summary, .desc, [class*="intro"]');
    const description = ogDesc ? ogDesc.content : (summaryEl ? summaryEl.textContent.trim() : '');

    // 封面图
    const ogImage = document.querySelector('meta[property="og:image"]');
    const headerImg = document.querySelector('.header-image img, .mdd-cover img, .banner img, .cover img');
    const coverImage = ogImage ? ogImage.content : (headerImg ? (headerImg.src || headerImg.getAttribute('data-src') || '') : '');

    // 图片集合
    const images = [];
    document.querySelectorAll('.header-image img, .mdd-photo img, .gallery img, .photo-list img').forEach(img => {
        const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-original') || '';
        if (src) images.push(src);
    });

    // 最佳旅行时间
    const timeEl = document.querySelector('[class*="best-time"], [class*="best_time"], .when-to-go, .travel-time');
    let bestTravelTime = timeEl ? timeEl.textContent.trim() : '';
    if (!bestTravelTime) {
        const allText = document.body.innerText;
        const timeMatch = allText.match(/最佳旅[行游]时间[：:]\s*([^\n]+)/);
        if (timeMatch) bestTravelTime = timeMatch[1].trim();
    }

    // 游记数量
    let travelNotesCount = 0;
    const countTexts = document.body.innerText;
    const notesMatch = countTexts.match(/(\d+(?:\.\d+)?)\s*[万k]?\s*(?:篇?游记|篇?笔记)/i);
    if (notesMatch) {
        let num = parseFloat(notesMatch[1]);
        if (/万/.test(notesMatch[0])) num *= 10000;
        if (/k/i.test(notesMatch[0])) num *= 1000;
        travelNotesCount = Math.round(num);
    }

    // POI 数量
    let poisCount = 0;
    const poisMatch = countTexts.match(/(\d+(?:\.\d+)?)\s*[万k]?\s*(?:个?景点|个?玩乐)/i);
    if (poisMatch) {
        let num = parseFloat(poisMatch[1]);
        if (/万/.test(poisMatch[0])) num *= 10000;
        if (/k/i.test(poisMatch[0])) num *= 1000;
        poisCount = Math.round(num);
    }

    return {
        mddId:            mddId,
        name:             name,
        nameEn:           nameEn,
        description:      description,
        coverImage:       coverImage,
        images:           images,
        bestTravelTime:   bestTravelTime,
        travelNotesCount: travelNotesCount,
        poisCount:        poisCount
    };
})()`

// JSExtractPOIList — 从 POI 列表页提取景点/美食/购物等 POI 列表
const JSExtractPOIList = `(() => {
    const pois = [];

    // 通用 POI 列表选择器，覆盖景点、美食、购物等页面
    const selectors = [
        '.poi-list li', '.poi_list li',
        '.list-item', '.item-list li',
        '.scenic-list li', '.food-list li', '.shop-list li',
        '.attract-list li',
        '[class*="poi"] li', '[class*="spot"] li',
        '.content-list li'
    ];

    let items = [];
    for (const sel of selectors) {
        items = document.querySelectorAll(sel);
        if (items.length > 0) break;
    }

    // 如果没有匹配到特定选择器，尝试通用卡片结构
    if (items.length === 0) {
        items = document.querySelectorAll('.card, .item, [class*="card"]');
    }

    items.forEach(item => {
        // 名称与链接
        const linkEl = item.querySelector('a[href*="/poi/"], a.title, a h3, h3 a, h2 a, .title a, a[href*="jd"]');
        const name = linkEl ? linkEl.textContent.trim() : '';
        const url = linkEl ? linkEl.href : '';

        // 评分
        const ratingEl = item.querySelector('.score, .rating, [class*="score"], [class*="rating"], em');
        let rating = ratingEl ? ratingEl.textContent.trim() : '';
        rating = rating.replace(/[^0-9.]/g, '');

        // 分类/标签
        const catEl = item.querySelector('.type, .tag, .category, [class*="type"], [class*="tag"], [class*="cate"]');
        const category = catEl ? catEl.textContent.trim() : '';

        // 图片
        const imgEl = item.querySelector('img');
        const image = imgEl ? (imgEl.src || imgEl.getAttribute('data-src') || imgEl.getAttribute('data-original') || '') : '';

        if (name) {
            pois.push({
                name:     name,
                url:      url,
                rating:   rating,
                category: category,
                image:    image
            });
        }
    });

    return { pois: pois };
})()`

// JSExtractGuideList — 从攻略列表页提取攻略条目
const JSExtractGuideList = `(() => {
    const guides = [];

    // 攻略列表选择器
    const selectors = [
        '.guide-list li', '.guide_list li',
        '.gonglve-list li', '.gonglve_list li',
        '.article-list li', '.article_list li',
        '.note-list li', '.note_list li',
        '[class*="guide"] li', '[class*="article"] li',
        '.content-list li'
    ];

    let items = [];
    for (const sel of selectors) {
        items = document.querySelectorAll(sel);
        if (items.length > 0) break;
    }

    items.forEach(item => {
        // 标题与链接
        const linkEl = item.querySelector('a.title, h2 a, h3 a, .title a, a[href*="/i/"], a[href*="/gonglve/"]');
        const title = linkEl ? linkEl.textContent.trim() : '';
        const url = linkEl ? linkEl.href : '';

        // 作者
        const authorEl = item.querySelector('.author, .user-name, .name, [class*="author"] a, [class*="user"] a');
        const author = authorEl ? authorEl.textContent.trim() : '';

        // 浏览量
        const viewsEl = item.querySelector('.view, .num_view, [class*="view"], [class*="read"]');
        let views = viewsEl ? viewsEl.textContent.trim() : '';
        views = views.replace(/[^0-9.万k]/gi, '');

        if (title) {
            guides.push({
                title:  title,
                url:    url,
                author: author,
                views:  views
            });
        }
    });

    return { guides: guides };
})()`

// JSExtractQAList — 从问答列表页提取问题条目
const JSExtractQAList = `(() => {
    const questions = [];

    // 问答列表选择器
    const selectors = [
        '.qa-list li', '.qa_list li',
        '.question-list li', '.question_list li',
        '.wenda-list li', '.wenda_list li',
        '[class*="question"] li', '[class*="qa"] li', '[class*="wenda"] li',
        '.ask-list li', '.ask_list li'
    ];

    let items = [];
    for (const sel of selectors) {
        items = document.querySelectorAll(sel);
        if (items.length > 0) break;
    }

    items.forEach(item => {
        // 问题标题与链接
        const linkEl = item.querySelector('a.title, h2 a, h3 a, .title a, a[href*="/wenda/"], a[href*="question"]');
        const title = linkEl ? linkEl.textContent.trim() : '';
        const url = linkEl ? linkEl.href : '';

        // 回答数量
        const answerEl = item.querySelector('.answer-count, .answer_count, [class*="answer"], .reply, .count');
        let answerCount = 0;
        if (answerEl) {
            const m = answerEl.textContent.match(/(\d+)/);
            if (m) answerCount = parseInt(m[1], 10);
        }

        if (title) {
            questions.push({
                title:       title,
                url:         url,
                answerCount: answerCount
            });
        }
    });

    return { questions: questions };
})()`

// JSExtractRanking — 从排行榜页面提取排行条目
const JSExtractRanking = `(() => {
    const items = [];

    // 排行榜列表选择器
    const selectors = [
        '.rank-list li', '.rank_list li',
        '.ranking-list li', '.ranking_list li',
        '.top-list li', '.top_list li',
        '[class*="rank"] li', '[class*="ranking"] li',
        '.list-ranking li', '.bangdan li',
        'ol li'
    ];

    let els = [];
    for (const sel of selectors) {
        els = document.querySelectorAll(sel);
        if (els.length > 0) break;
    }

    els.forEach((el, index) => {
        // 排名：优先从元素中提取，否则使用索引
        const rankEl = el.querySelector('.rank, .num, .rank-num, [class*="rank"]');
        let rank = index + 1;
        if (rankEl) {
            const m = rankEl.textContent.match(/(\d+)/);
            if (m) rank = parseInt(m[1], 10);
        }

        // 名称与链接
        const linkEl = el.querySelector('a.title, h2 a, h3 a, .title a, a[href*="/poi/"], a[href*="/jd/"]');
        const name = linkEl ? linkEl.textContent.trim() : el.querySelector('.title, .name, h3, h2')?.textContent?.trim() || '';
        const url = linkEl ? linkEl.href : '';

        // 评分
        const scoreEl = el.querySelector('.score, .rating, [class*="score"], [class*="rating"]');
        let score = scoreEl ? scoreEl.textContent.trim() : '';
        score = score.replace(/[^0-9.]/g, '');

        // 分类/标签
        const catEl = el.querySelector('.type, .tag, .category, [class*="type"], [class*="tag"], [class*="cate"]');
        const category = catEl ? catEl.textContent.trim() : '';

        if (name) {
            items.push({
                rank:     rank,
                name:     name,
                url:      url,
                score:    score,
                category: category
            });
        }
    });

    return { items: items };
})()`
