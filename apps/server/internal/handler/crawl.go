// crawl.go 提供马蜂窝各数据类型的可复用爬取助手。
//
// HTTP handler（mafengwo.go）与批量任务执行器（batch_executor.go）、
// cron 刷新（RefreshGuideDetail）共用同一套抓取→清洗→类型化保存逻辑，
// 避免字段/行为漂移（设计 D3/D12）。
package handler

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"math"
	"net/url"
	"strings"
	"time"

	"github.com/pathfinding/server/internal/browser"
	"github.com/pathfinding/server/internal/service"
	"github.com/pathfinding/server/internal/store"
)

// defaultMaxRetries 是详情/目的地爬取的默认重试次数。
const defaultMaxRetries = 3

// errKernelNotConfigured 在 Kernel.sh 未配置时由爬取助手返回；
// 调用方必须将其透出（HTTP 503 或任务失败原因），不得吞掉。
var errKernelNotConfigured = errors.New("browser service not configured")

// extractFromPage 创建浏览器会话、导航到 pageURL（scrollCount > 0 时滚动加载）
// 并执行提取脚本，资源清理统一在此完成。
func (h *Handler) extractFromPage(ctx context.Context, pageURL string, navWaitMs, scrollCount int, js string, out any) error {
	if h.Kernel == nil {
		return errKernelNotConfigured
	}

	kernelSession, browserSession, err := h.createBrowserSession(ctx)
	if err != nil {
		return fmt.Errorf("failed to create browser session: %w", err)
	}
	defer h.closeBrowserSession(ctx, kernelSession, browserSession)

	if err := browserSession.Navigate(pageURL, navWaitMs); err != nil {
		return fmt.Errorf("failed to navigate %s: %w", pageURL, err)
	}
	if scrollCount > 0 {
		if err := browserSession.ScrollToLoadMore(scrollCount, 2000); err != nil {
			return fmt.Errorf("failed to scroll %s: %w", pageURL, err)
		}
	}
	if err := browserSession.Evaluate(js, out); err != nil {
		return fmt.Errorf("failed to extract from %s: %w", pageURL, err)
	}
	return nil
}

// ---------------------------------------------------------------------------
// 游记列表（设计 D10：city 维度）
// ---------------------------------------------------------------------------

// noteListCrawl 是游记列表爬取结果。CityScoped=false 表示全站 feed，
// 调用方不得把 URL 归属到任何城市。
type noteListCrawl struct {
	URLs       []string
	SourceURL  string
	CityScoped bool
}

func (h *Handler) crawlTravelNoteList(ctx context.Context, mddID, city string, scrollCount int) (*noteListCrawl, error) {
	listURL, cityScoped := service.BuildMafengwoListURL(mddID, city)

	var result browser.GuideURLResult
	if err := h.extractFromPage(ctx, listURL, 3000, scrollCount, browser.JSExtractGuideURLs, &result); err != nil {
		return nil, err
	}
	return &noteListCrawl{URLs: result.URLs, SourceURL: listURL, CityScoped: cityScoped}, nil
}

// ---------------------------------------------------------------------------
// 游记/攻略详情
// ---------------------------------------------------------------------------

// guideDetailCrawl 是游记详情爬取+保存的完整结果。
type guideDetailCrawl struct {
	Raw              browser.GuideDetailResult
	ExternalID       string
	Content          string
	ContentTruncated bool
	ContentMarkdown  string
	// Views/Likes 为 nil 表示原始计数字符串解析失败（设计 D4）：
	// HTTP 响应序列化为 null，TS 侧改用 viewsRaw/likesRaw 重解析并记录 ingestWarnings，
	// 绝不把解析失败伪造成计数 0。
	Views *int
	Likes *int
	// QualityScore 为 0-1 浮点（HTTP 响应口径）；入库为 0-100 int。
	QualityScore float64
	PublishedAt  *time.Time
	Saved        bool
	SaveError    string
}

// crawlGuideDetail 抓取游记/攻略详情并同步保存到 mafengwo_guides 暂存表。
// 空提取/反爬页判失败并重试（设计 D11），重试耗尽返回错误且不落库；
// 保存失败透出在 Saved/SaveError（设计 D3）。
func (h *Handler) crawlGuideDetail(ctx context.Context, sourceURL string, maxRetries int, destID, destName string) (*guideDetailCrawl, error) {
	if maxRetries <= 0 {
		maxRetries = defaultMaxRetries
	}
	mobileURL := browser.ConvertToMobileURL(sourceURL)

	var lastError error
	for attempt := 1; attempt <= maxRetries; attempt++ {
		slog.Info("正在爬取游记详情", "url", sourceURL, "attempt", attempt)

		var result browser.GuideDetailResult
		if err := h.extractFromPage(ctx, mobileURL, 5000, 0, browser.JSExtractGuideDetail, &result); err != nil {
			if errors.Is(err, errKernelNotConfigured) {
				return nil, err // 配置缺失，重试无意义
			}
			lastError = err
			slog.Error("详情提取失败，重试中", "attempt", attempt, "url", sourceURL, "error", err)
			continue
		}

		// 空提取/反爬页判失败，不落库（设计 D11）
		if err := service.DetectExtractionFailure(result.Title, result.Content); err != nil {
			lastError = err
			slog.Warn("提取结果为空壳/反爬页，重试中", "attempt", attempt, "url", sourceURL, "reason", err)
			continue
		}

		cleanedContent, contentTruncated := service.CleanContent(result.Content, 10000)
		externalID := service.ExtractExternalID(sourceURL)
		views, viewsOK := parseCount("views", result.Views, sourceURL)
		likes, likesOK := parseCount("likes", result.Likes, sourceURL)
		qualityScore := service.CalculateQualityScore(
			result.Title, cleanedContent, result.Author,
			result.Images, views, likes,
		)
		contentMarkdown := service.GenerateGuideMarkdownContent(result.Title, cleanedContent, result.Images)
		publishedAt := service.ParsePublishedDate(result.PublishedAt)

		// 同步保存到 mafengwo_guides 暂存表（设计 D2/D3：不写 travel_guides，不走事件总线）。
		// views_count/likes_count 列为 NOT NULL：解析失败时按列默认语义存 0，
		// 失败信号经 HTTP 响应的 views/likes=null + viewsRaw/likesRaw 透出（设计 D4），
		// cron 刷新路径额外由 parseCount 的告警日志兜底可见性。
		saved, saveError := h.trySave(ctx, "guide_detail", func(ctx context.Context) error {
			return h.Store.SaveGuideDetail(ctx, store.GuideDetail{
				GuideID:         externalID,
				SourceURL:       sourceURL,
				Title:           result.Title,
				DestinationID:   destID,
				DestinationName: destName,
				AuthorName:      result.Author,
				Content:         cleanedContent,
				ContentHTML:     result.ContentHTML,
				CoverImageURL:   result.CoverImage,
				ImageURLs:       result.Images,
				ViewsCount:      views,
				LikesCount:      likes,
				QualityScore:    int(math.Round(qualityScore * 100)),
				PublishedAt:     publishedAt,
			})
		})

		slog.Info("游记详情爬取成功",
			"url", sourceURL,
			"title", result.Title,
			"contentLen", len(cleanedContent),
			"images", len(result.Images),
			"qualityScore", qualityScore,
			"saved", saved,
		)

		return &guideDetailCrawl{
			Raw:              result,
			ExternalID:       externalID,
			Content:          cleanedContent,
			ContentTruncated: contentTruncated,
			ContentMarkdown:  contentMarkdown,
			Views:            optionalCount(views, viewsOK),
			Likes:            optionalCount(likes, likesOK),
			QualityScore:     qualityScore,
			PublishedAt:      publishedAt,
			Saved:            saved,
			SaveError:        saveError,
		}, nil
	}

	// 所有重试都失败：失败 URL 与原因必须返回给调用方（设计 D11）
	return nil, fmt.Errorf("Failed after %d attempts for %s: %v", maxRetries, sourceURL, lastError)
}

// parseCount 解析计数原始字符串（设计 D4）。
// 非空但不可解析时记录告警：cron 刷新路径不经过 TS 侧 ingestWarnings，
// 该日志是这条路径上解析失败唯一的可见信号。
func parseCount(field, raw, sourceURL string) (int, bool) {
	value, ok := service.ParseChineseNumber(raw)
	if !ok && strings.TrimSpace(raw) != "" {
		slog.Warn("计数解析失败", "field", field, "raw", raw, "url", sourceURL)
	}
	return value, ok
}

// optionalCount 把解析结果转为 HTTP 响应口径：解析失败返回 nil（JSON null），
// TS 侧据此回退到 viewsRaw/likesRaw 重解析；绝不把失败伪造成 0。
func optionalCount(value int, ok bool) *int {
	if !ok {
		return nil
	}
	return &value
}

// RefreshGuideDetail 重抓单条游记详情并走类型化保存路径（cron stale 刷新用）。
// 爬取失败或保存失败均返回 error，绝不静默。
func (h *Handler) RefreshGuideDetail(ctx context.Context, sourceURL string) error {
	out, err := h.crawlGuideDetail(ctx, sourceURL, defaultMaxRetries, "", "")
	if err != nil {
		return err
	}
	if !out.Saved {
		return fmt.Errorf("refresh crawled %s but save failed: %s", sourceURL, out.SaveError)
	}
	return nil
}

// ---------------------------------------------------------------------------
// 目的地
// ---------------------------------------------------------------------------

type destinationCrawl struct {
	Result    browser.DestinationResult
	SourceURL string
	Saved     bool
	SaveError string
}

func (h *Handler) crawlDestination(ctx context.Context, destID, destName string, maxRetries int) (*destinationCrawl, error) {
	if maxRetries <= 0 {
		maxRetries = defaultMaxRetries
	}

	pageURL := fmt.Sprintf("https://www.mafengwo.cn/travel-scenic-spot/mafengwo/%s.html", destID)
	if destID == "" {
		pageURL = "https://www.mafengwo.cn/search/q.php?q=" + url.QueryEscape(destName)
	}

	var lastError error
	for attempt := 1; attempt <= maxRetries; attempt++ {
		slog.Info("正在爬取目的地信息", "destinationId", destID, "attempt", attempt)

		var result browser.DestinationResult
		if err := h.extractFromPage(ctx, pageURL, 5000, 0, browser.JSExtractDestination, &result); err != nil {
			if errors.Is(err, errKernelNotConfigured) {
				return nil, err
			}
			lastError = err
			continue
		}

		// 补充 ID（如果从 URL 中提取到了）
		if result.MddID == "" && destID != "" {
			result.MddID = destID
		}

		slog.Info("目的地信息爬取成功",
			"mddId", result.MddID,
			"name", result.Name,
			"travelNotes", result.TravelNotesCount,
		)

		// 同步保存到 mafengwo_destinations（设计 D3）
		saved, saveError := h.trySave(ctx, "destination", func(ctx context.Context) error {
			return h.Store.SaveDestination(ctx, store.Destination{
				MddID:            result.MddID,
				SourceURL:        pageURL,
				Name:             result.Name,
				NameEn:           result.NameEn,
				Description:      result.Description,
				CoverImageURL:    result.CoverImage,
				ImageURLs:        result.Images,
				BestTravelTime:   result.BestTravelTime,
				TravelNotesCount: result.TravelNotesCount,
				PoisCount:        result.PoisCount,
			})
		})

		return &destinationCrawl{Result: result, SourceURL: pageURL, Saved: saved, SaveError: saveError}, nil
	}

	return nil, fmt.Errorf("Failed after %d attempts for destination %s: %v", maxRetries, destID, lastError)
}

// ---------------------------------------------------------------------------
// 攻略列表
// ---------------------------------------------------------------------------

func (h *Handler) crawlGuideListPage(ctx context.Context, destID string, scrollCount int) (*browser.GuideListResult, error) {
	if scrollCount <= 0 {
		scrollCount = 5
	}
	pageURL := fmt.Sprintf("https://www.mafengwo.cn/gonglve/ziyouxing/%s.html", destID)

	var result browser.GuideListResult
	if err := h.extractFromPage(ctx, pageURL, 3000, scrollCount, browser.JSExtractGuideList, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// ---------------------------------------------------------------------------
// POI 列表
// ---------------------------------------------------------------------------

// poiCategoryPaths 是 POI 分类到马蜂窝 URL 路径的映射。
var poiCategoryPaths = map[string]string{
	"attraction": "jd",
	"restaurant": "cy",
	"hotel":      "jd",
	"shopping":   "gw",
}

type poiListCrawl struct {
	POIs       []browser.POIItem
	SavedCount int
	SaveErrors []string
}

func (h *Handler) crawlPOIList(ctx context.Context, destID, destName, category, overrideURL string, scrollCount int) (*poiListCrawl, error) {
	if scrollCount <= 0 {
		scrollCount = 5
	}
	pageURL := fmt.Sprintf("https://www.mafengwo.cn/%s/%s/gonglve.html", poiCategoryPaths[category], destID)
	if overrideURL != "" {
		pageURL = overrideURL
	}

	var result browser.POIListResult
	if err := h.extractFromPage(ctx, pageURL, 3000, scrollCount, browser.JSExtractPOIList, &result); err != nil {
		return nil, err
	}

	slog.Info("POI 列表爬取成功", "destinationId", destID, "category", category, "count", len(result.POIs))

	// 类型化转换：poiId 必须可从 URL 提取，rating 显式解析失败存 NULL（设计 D3）
	pois := make([]store.POI, 0, len(result.POIs))
	var saveErrors []string
	for _, poi := range result.POIs {
		poiID := service.ExtractPOIID(poi.URL)
		if poiID == "" {
			saveErrors = append(saveErrors, fmt.Sprintf("POI %q: cannot extract poiId from URL %q", poi.Name, poi.URL))
			continue
		}
		var rating sql.NullFloat64
		if v, ok := service.ParseRating(poi.Rating); ok {
			rating = sql.NullFloat64{Float64: v, Valid: true}
		}
		pois = append(pois, store.POI{
			PoiID:           poiID,
			SourceURL:       poi.URL,
			Name:            poi.Name,
			Category:        category,
			DestinationID:   destID,
			DestinationName: destName,
			Rating:          rating,
			CoverImageURL:   poi.Image,
		})
	}

	savedCount := 0
	if h.Store == nil {
		slog.Warn("DB 未配置，跳过保存", "dataType", "poi_list")
		saveErrors = append(saveErrors, errDBNotConfigured)
	} else {
		saveResult := h.Store.SavePOIs(ctx, pois)
		savedCount = saveResult.SavedCount
		saveErrors = append(saveErrors, saveResult.Errors...)
		if len(saveResult.Errors) > 0 {
			slog.Error("部分 POI 保存失败", "destinationId", destID, "failed", len(saveResult.Errors))
		}
	}

	return &poiListCrawl{POIs: result.POIs, SavedCount: savedCount, SaveErrors: saveErrors}, nil
}

// ---------------------------------------------------------------------------
// 问答列表
// ---------------------------------------------------------------------------

type qaListCrawl struct {
	Questions  []browser.QAItem
	SavedCount int
	SaveErrors []string
}

func (h *Handler) crawlQAList(ctx context.Context, destID, destName, overrideURL string, scrollCount int) (*qaListCrawl, error) {
	if scrollCount <= 0 {
		scrollCount = 5
	}
	pageURL := fmt.Sprintf("https://www.mafengwo.cn/wenda/area-%s.html", destID)
	if overrideURL != "" {
		pageURL = overrideURL
	}

	var result browser.QAListResult
	if err := h.extractFromPage(ctx, pageURL, 3000, scrollCount, browser.JSExtractQAList, &result); err != nil {
		return nil, err
	}

	slog.Info("问答列表爬取成功", "destinationId", destID, "count", len(result.Questions))

	// 类型化转换：questionId 必须可从 URL 提取（设计 D3）
	qas := make([]store.QA, 0, len(result.Questions))
	var saveErrors []string
	for _, qa := range result.Questions {
		questionID := service.ExtractQAID(qa.URL)
		if questionID == "" {
			saveErrors = append(saveErrors, fmt.Sprintf("QA %q: cannot extract questionId from URL %q", qa.Title, qa.URL))
			continue
		}
		qas = append(qas, store.QA{
			QuestionID:      questionID,
			SourceURL:       qa.URL,
			Title:           qa.Title,
			DestinationID:   destID,
			DestinationName: destName,
			AnswersCount:    qa.AnswerCount,
		})
	}

	savedCount := 0
	if h.Store == nil {
		slog.Warn("DB 未配置，跳过保存", "dataType", "qa_list")
		saveErrors = append(saveErrors, errDBNotConfigured)
	} else {
		saveResult := h.Store.SaveQA(ctx, qas)
		savedCount = saveResult.SavedCount
		saveErrors = append(saveErrors, saveResult.Errors...)
		if len(saveResult.Errors) > 0 {
			slog.Error("部分问答保存失败", "destinationId", destID, "failed", len(saveResult.Errors))
		}
	}

	return &qaListCrawl{Questions: result.Questions, SavedCount: savedCount, SaveErrors: saveErrors}, nil
}

// ---------------------------------------------------------------------------
// 排行榜
// ---------------------------------------------------------------------------

// rankingPaths 是排行榜类型到马蜂窝 URL 路径的映射。
var rankingPaths = map[string]string{
	"must_visit": "jd",
	"food":       "cy",
	"hotel":      "jd",
	"shopping":   "gw",
	"hidden_gem": "jd",
}

type rankingCrawl struct {
	Items     []browser.RankingItem
	RankingID string
	SourceURL string
	Saved     bool
	SaveError string
}

func (h *Handler) crawlRanking(ctx context.Context, destID, destName, rankingType string) (*rankingCrawl, error) {
	pageURL := fmt.Sprintf("https://www.mafengwo.cn/%s/%s/gonglve.html", rankingPaths[rankingType], destID)

	var result browser.RankingResult
	if err := h.extractFromPage(ctx, pageURL, 5000, 0, browser.JSExtractRanking, &result); err != nil {
		return nil, err
	}

	slog.Info("排行榜爬取成功", "destinationId", destID, "rankingType", rankingType, "count", len(result.Items))

	// rankingId 为业务键 destinationId_rankingType，与 D1 唯一索引对应。
	rankingID := fmt.Sprintf("%s_%s", destID, rankingType)
	saved, saveError := h.trySave(ctx, "ranking", func(ctx context.Context) error {
		itemsJSON, err := json.Marshal(result.Items)
		if err != nil {
			return fmt.Errorf("marshal ranking items: %w", err)
		}
		title := rankingType
		if destName != "" {
			title = destName + " " + rankingType
		}
		return h.Store.SaveRankings(ctx, store.Ranking{
			RankingID:       rankingID,
			SourceURL:       pageURL,
			RankingType:     rankingType,
			Title:           title,
			DestinationID:   destID,
			DestinationName: destName,
			Items:           itemsJSON,
		})
	})

	return &rankingCrawl{Items: result.Items, RankingID: rankingID, SourceURL: pageURL, Saved: saved, SaveError: saveError}, nil
}
