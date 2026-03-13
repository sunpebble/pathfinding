package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/pathfinding/server/internal/browser"
	"github.com/pathfinding/server/internal/eventbus"
	"github.com/pathfinding/server/internal/middleware"
	"github.com/pathfinding/server/internal/service"
)

// requireKernel 检查 Kernel.sh API Key 是否已配置。
// 未配置时返回 503，已配置返回 true。
func (h *Handler) requireKernel(w http.ResponseWriter) bool {
	if h.Kernel == nil {
		middleware.Error(w, 503, "Browser service not configured")
		return false
	}
	return true
}

// createBrowserSession 创建一个 Kernel.sh 云浏览器会话并建立 chromedp 连接。
func (h *Handler) createBrowserSession(ctx context.Context) (*browser.KernelSession, *browser.Session, error) {
	kernelSession, err := h.Kernel.CreateSession(ctx, browser.CreateSessionOptions{
		Stealth:        true,
		Headless:       false,
		TimeoutSeconds: 120,
	})
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create kernel session: %w", err)
	}

	browserSession, err := browser.NewSession(ctx, kernelSession.CdpWsURL)
	if err != nil {
		// 创建 chromedp session 失败时清理 kernel session
		_ = h.Kernel.DeleteSession(ctx, kernelSession.SessionID)
		return nil, nil, fmt.Errorf("failed to connect to browser: %w", err)
	}

	return kernelSession, browserSession, nil
}

// closeBrowserSession 关闭浏览器会话并清理 Kernel.sh 资源。
func (h *Handler) closeBrowserSession(ctx context.Context, kernelSession *browser.KernelSession, browserSession *browser.Session) {
	if browserSession != nil {
		browserSession.Close()
	}
	if kernelSession != nil {
		_ = h.Kernel.DeleteSession(ctx, kernelSession.SessionID)
	}
}

// POST /api/crawler/mafengwo/list — 爬取游记列表页
func (h *Handler) HandleMafengwoList(w http.ResponseWriter, r *http.Request) {
	var req struct {
		City        string `json:"city"`
		ScrollCount int    `json:"scrollCount"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		middleware.Error(w, 400, "Invalid JSON body")
		return
	}
	if req.City == "" {
		middleware.Error(w, 400, "City name is required")
		return
	}
	if req.ScrollCount <= 0 {
		req.ScrollCount = 5
	}
	if req.ScrollCount > 20 {
		req.ScrollCount = 20
	}

	if !h.requireKernel(w) {
		return
	}

	ctx := r.Context()
	kernelSession, browserSession, err := h.createBrowserSession(ctx)
	if err != nil {
		slog.Error("浏览器会话创建失败", "error", err)
		middleware.Error(w, 500, "Failed to create browser session: "+err.Error())
		return
	}
	defer h.closeBrowserSession(ctx, kernelSession, browserSession)

	// 访问马蜂窝移动版游记页面
	url := "https://m.mafengwo.cn/note/"
	slog.Info("正在爬取游记列表", "city", req.City, "url", url)

	if err := browserSession.Navigate(url, 3000); err != nil {
		slog.Error("页面导航失败", "url", url, "error", err)
		middleware.Error(w, 500, "Failed to navigate: "+err.Error())
		return
	}

	// 滚动加载更多
	if err := browserSession.ScrollToLoadMore(req.ScrollCount, 2000); err != nil {
		slog.Error("滚动加载失败", "error", err)
		middleware.Error(w, 500, "Failed to scroll: "+err.Error())
		return
	}

	// 提取游记 URL
	var result browser.GuideURLResult
	if err := browserSession.Evaluate(browser.JSExtractGuideURLs, &result); err != nil {
		slog.Error("提取游记链接失败", "error", err)
		middleware.Error(w, 500, "Failed to extract URLs: "+err.Error())
		return
	}

	slog.Info("游记列表爬取完成", "city", req.City, "count", len(result.URLs))

	// 发送事件
	h.EventBus.Publish(ctx, eventbus.Event{
		Topic: "crawler.mafengwo.list.completed",
		Data: map[string]any{
			"city": req.City,
			"urls": result.URLs,
		},
	})

	middleware.JSON(w, 200, map[string]any{
		"success": true,
		"data": map[string]any{
			"city":  req.City,
			"urls":  result.URLs,
			"total": len(result.URLs),
		},
	})
}

// POST /api/crawler/mafengwo/detail — 爬取游记详情页
func (h *Handler) HandleMafengwoDetail(w http.ResponseWriter, r *http.Request) {
	var req struct {
		URL        string `json:"url"`
		MaxRetries int    `json:"maxRetries"`
		UseAI      bool   `json:"useAI"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		middleware.Error(w, 400, "Invalid JSON body")
		return
	}
	if req.URL == "" {
		middleware.Error(w, 400, "URL is required")
		return
	}
	if req.MaxRetries <= 0 {
		req.MaxRetries = 3
	}

	if !h.requireKernel(w) {
		return
	}

	ctx := r.Context()
	var lastError error

	for attempt := 1; attempt <= req.MaxRetries; attempt++ {
		slog.Info("正在爬取游记详情", "url", req.URL, "attempt", attempt)

		kernelSession, browserSession, err := h.createBrowserSession(ctx)
		if err != nil {
			lastError = err
			slog.Error("浏览器会话创建失败，重试中", "attempt", attempt, "error", err)
			continue
		}

		// 转换为移动版 URL
		mobileURL := browserSession.ConvertToMobileURL(req.URL)

		// 导航到页面
		if err := browserSession.Navigate(mobileURL, 5000); err != nil {
			h.closeBrowserSession(ctx, kernelSession, browserSession)
			lastError = err
			slog.Error("页面导航失败，重试中", "attempt", attempt, "error", err)
			continue
		}

		// 提取游记详情
		var result browser.GuideDetailResult
		if err := browserSession.Evaluate(browser.JSExtractGuideDetail, &result); err != nil {
			h.closeBrowserSession(ctx, kernelSession, browserSession)
			lastError = err
			slog.Error("提取详情失败，重试中", "attempt", attempt, "error", err)
			continue
		}

		h.closeBrowserSession(ctx, kernelSession, browserSession)

		// 内容清洗
		cleanedContent := service.CleanContent(result.Content, 10000)
		externalID := service.ExtractExternalID(req.URL)
		qualityScore := service.CalculateQualityScore(
			result.Title, cleanedContent, result.Author,
			result.Images,
			service.ParseChineseNumber(result.Views),
			service.ParseChineseNumber(result.Likes),
		)

		slog.Info("游记详情爬取成功",
			"url", req.URL,
			"title", result.Title,
			"contentLen", len(cleanedContent),
			"images", len(result.Images),
			"qualityScore", qualityScore,
		)

		// 发送事件
		h.EventBus.Publish(ctx, eventbus.Event{
			Topic: "crawler.mafengwo.detail.completed",
			Data: map[string]any{
				"url":          req.URL,
				"externalId":   externalID,
				"title":        result.Title,
				"content":      cleanedContent,
				"contentHtml":  result.ContentHTML,
				"author":       result.Author,
				"views":        service.ParseChineseNumber(result.Views),
				"likes":        service.ParseChineseNumber(result.Likes),
				"coverImage":   result.CoverImage,
				"images":       result.Images,
				"qualityScore": qualityScore,
				"platform":     "mafengwo",
			},
		})

		middleware.JSON(w, 200, map[string]any{
			"success": true,
			"data": map[string]any{
				"url":          req.URL,
				"externalId":   externalID,
				"title":        result.Title,
				"content":      cleanedContent,
				"author":       result.Author,
				"views":        result.Views,
				"likes":        result.Likes,
				"coverImage":   result.CoverImage,
				"images":       result.Images,
				"qualityScore": qualityScore,
			},
		})
		return
	}

	// 所有重试都失败
	slog.Error("游记详情爬取失败（重试已用完）", "url", req.URL, "error", lastError)
	middleware.Error(w, 500, "Failed after retries: "+lastError.Error())
}

// POST /api/crawler/mafengwo/destination — 爬取目的地信息
func (h *Handler) HandleMafengwoDestination(w http.ResponseWriter, r *http.Request) {
	var req struct {
		DestinationID   string `json:"destinationId"`
		DestinationName string `json:"destinationName"`
		MaxRetries      int    `json:"maxRetries"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		middleware.Error(w, 400, "Invalid JSON body")
		return
	}
	if req.DestinationID == "" && req.DestinationName == "" {
		middleware.Error(w, 400, "destinationId or destinationName required")
		return
	}
	if req.MaxRetries <= 0 {
		req.MaxRetries = 3
	}

	if !h.requireKernel(w) {
		return
	}

	ctx := r.Context()
	var lastError error

	for attempt := 1; attempt <= req.MaxRetries; attempt++ {
		slog.Info("正在爬取目的地信息", "destinationId", req.DestinationID, "attempt", attempt)

		kernelSession, browserSession, err := h.createBrowserSession(ctx)
		if err != nil {
			lastError = err
			continue
		}

		// 构造目的地 URL
		url := fmt.Sprintf("https://www.mafengwo.cn/travel-scenic-spot/mafengwo/%s.html", req.DestinationID)
		if req.DestinationID == "" {
			url = fmt.Sprintf("https://www.mafengwo.cn/search/q.php?q=%s", req.DestinationName)
		}

		if err := browserSession.Navigate(url, 5000); err != nil {
			h.closeBrowserSession(ctx, kernelSession, browserSession)
			lastError = err
			continue
		}

		var result browser.DestinationResult
		if err := browserSession.Evaluate(browser.JSExtractDestination, &result); err != nil {
			h.closeBrowserSession(ctx, kernelSession, browserSession)
			lastError = err
			continue
		}

		h.closeBrowserSession(ctx, kernelSession, browserSession)

		// 补充 ID（如果从 URL 中提取到了）
		if result.MddID == "" && req.DestinationID != "" {
			result.MddID = req.DestinationID
		}

		slog.Info("目的地信息爬取成功",
			"mddId", result.MddID,
			"name", result.Name,
			"travelNotes", result.TravelNotesCount,
		)

		h.EventBus.Publish(ctx, eventbus.Event{
			Topic: "crawler.mafengwo.destination.completed",
			Data: map[string]any{
				"mddId":            result.MddID,
				"name":             result.Name,
				"nameEn":           result.NameEn,
				"description":      result.Description,
				"coverImage":       result.CoverImage,
				"images":           result.Images,
				"bestTravelTime":   result.BestTravelTime,
				"travelNotesCount": result.TravelNotesCount,
				"poisCount":        result.PoisCount,
			},
		})

		middleware.JSON(w, 200, map[string]any{
			"success": true,
			"data":    result,
		})
		return
	}

	slog.Error("目的地爬取失败", "error", lastError)
	middleware.Error(w, 500, "Failed after retries: "+lastError.Error())
}

// POST /api/crawler/mafengwo/guide — 爬取攻略（列表/详情）
func (h *Handler) HandleMafengwoGuide(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Mode            string `json:"mode"`
		DestinationID   string `json:"destinationId"`
		DestinationName string `json:"destinationName"`
		GuideURL        string `json:"guideUrl"`
		ScrollCount     int    `json:"scrollCount"`
		MaxRetries      int    `json:"maxRetries"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		middleware.Error(w, 400, "Invalid JSON body")
		return
	}
	if req.Mode == "" {
		req.Mode = "list"
	}
	if req.Mode != "list" && req.Mode != "detail" {
		middleware.Error(w, 400, `mode must be "list" or "detail"`)
		return
	}
	if req.Mode == "list" && req.DestinationID == "" && req.DestinationName == "" {
		middleware.Error(w, 400, "destinationId or destinationName required for list mode")
		return
	}
	if req.Mode == "detail" && req.GuideURL == "" {
		middleware.Error(w, 400, "guideUrl required for detail mode")
		return
	}
	if req.ScrollCount <= 0 {
		req.ScrollCount = 5
	}
	if req.MaxRetries <= 0 {
		req.MaxRetries = 3
	}

	if !h.requireKernel(w) {
		return
	}

	ctx := r.Context()
	kernelSession, browserSession, err := h.createBrowserSession(ctx)
	if err != nil {
		middleware.Error(w, 500, "Failed to create browser session: "+err.Error())
		return
	}
	defer h.closeBrowserSession(ctx, kernelSession, browserSession)

	if req.Mode == "list" {
		// 攻略列表模式
		url := fmt.Sprintf("https://www.mafengwo.cn/gonglve/ziyouxing/%s.html", req.DestinationID)
		if err := browserSession.Navigate(url, 3000); err != nil {
			middleware.Error(w, 500, "Failed to navigate: "+err.Error())
			return
		}
		if err := browserSession.ScrollToLoadMore(req.ScrollCount, 2000); err != nil {
			middleware.Error(w, 500, "Failed to scroll: "+err.Error())
			return
		}

		var result browser.GuideListResult
		if err := browserSession.Evaluate(browser.JSExtractGuideList, &result); err != nil {
			middleware.Error(w, 500, "Failed to extract guides: "+err.Error())
			return
		}

		slog.Info("攻略列表爬取成功", "destinationId", req.DestinationID, "count", len(result.Guides))

		middleware.JSON(w, 200, map[string]any{
			"success": true,
			"data": map[string]any{
				"destinationId": req.DestinationID,
				"guides":        result.Guides,
				"total":         len(result.Guides),
			},
		})
	} else {
		// 攻略详情模式
		mobileURL := browserSession.ConvertToMobileURL(req.GuideURL)
		if err := browserSession.Navigate(mobileURL, 5000); err != nil {
			middleware.Error(w, 500, "Failed to navigate: "+err.Error())
			return
		}

		var result browser.GuideDetailResult
		if err := browserSession.Evaluate(browser.JSExtractGuideDetail, &result); err != nil {
			middleware.Error(w, 500, "Failed to extract detail: "+err.Error())
			return
		}

		cleanedContent := service.CleanContent(result.Content, 10000)

		slog.Info("攻略详情爬取成功", "url", req.GuideURL, "title", result.Title)

		h.EventBus.Publish(ctx, eventbus.Event{
			Topic: "crawler.mafengwo.guide.detail.completed",
			Data: map[string]any{
				"url":     req.GuideURL,
				"title":   result.Title,
				"content": cleanedContent,
				"author":  result.Author,
				"images":  result.Images,
			},
		})

		middleware.JSON(w, 200, map[string]any{
			"success": true,
			"data": map[string]any{
				"url":     req.GuideURL,
				"title":   result.Title,
				"content": cleanedContent,
				"author":  result.Author,
				"images":  result.Images,
			},
		})
	}
}

// POST /api/crawler/mafengwo/poi — 爬取 POI 列表（景点/美食/酒店/购物）
func (h *Handler) HandleMafengwoPOI(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Mode            string `json:"mode"`
		DestinationID   string `json:"destinationId"`
		DestinationName string `json:"destinationName"`
		Category        string `json:"category"`
		PoiURL          string `json:"poiUrl"`
		ScrollCount     int    `json:"scrollCount"`
		MaxRetries      int    `json:"maxRetries"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		middleware.Error(w, 400, "Invalid JSON body")
		return
	}
	if req.Mode == "" {
		req.Mode = "list"
	}
	if req.Category == "" {
		req.Category = "attraction"
	}
	validCategories := map[string]bool{"attraction": true, "restaurant": true, "hotel": true, "shopping": true}
	if !validCategories[req.Category] {
		middleware.Error(w, 400, "Invalid category")
		return
	}

	if !h.requireKernel(w) {
		return
	}

	ctx := r.Context()
	kernelSession, browserSession, err := h.createBrowserSession(ctx)
	if err != nil {
		middleware.Error(w, 500, "Failed to create browser session: "+err.Error())
		return
	}
	defer h.closeBrowserSession(ctx, kernelSession, browserSession)

	// 分类到 URL 路径的映射
	categoryPaths := map[string]string{
		"attraction": "jd",
		"restaurant": "cy",
		"hotel":      "jd",
		"shopping":   "gw",
	}
	path := categoryPaths[req.Category]

	url := fmt.Sprintf("https://www.mafengwo.cn/%s/%s/gonglve.html", path, req.DestinationID)
	if req.PoiURL != "" {
		url = req.PoiURL
	}

	if err := browserSession.Navigate(url, 3000); err != nil {
		middleware.Error(w, 500, "Failed to navigate: "+err.Error())
		return
	}

	if req.ScrollCount <= 0 {
		req.ScrollCount = 5
	}
	if err := browserSession.ScrollToLoadMore(req.ScrollCount, 2000); err != nil {
		middleware.Error(w, 500, "Failed to scroll: "+err.Error())
		return
	}

	var result browser.POIListResult
	if err := browserSession.Evaluate(browser.JSExtractPOIList, &result); err != nil {
		middleware.Error(w, 500, "Failed to extract POIs: "+err.Error())
		return
	}

	slog.Info("POI 列表爬取成功",
		"destinationId", req.DestinationID,
		"category", req.Category,
		"count", len(result.POIs),
	)

	// 为每个 POI 详情发送事件
	for _, poi := range result.POIs {
		h.EventBus.Publish(ctx, eventbus.Event{
			Topic: "crawler.mafengwo.poi.detail.completed",
			Data: map[string]any{
				"destinationId": req.DestinationID,
				"category":      req.Category,
				"name":          poi.Name,
				"url":           poi.URL,
				"rating":        poi.Rating,
				"image":         poi.Image,
			},
		})
	}

	middleware.JSON(w, 200, map[string]any{
		"success": true,
		"data": map[string]any{
			"destinationId": req.DestinationID,
			"category":      req.Category,
			"pois":          result.POIs,
			"total":         len(result.POIs),
		},
	})
}

// POST /api/crawler/mafengwo/qa — 爬取问答列表
func (h *Handler) HandleMafengwoQA(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Mode            string `json:"mode"`
		DestinationID   string `json:"destinationId"`
		DestinationName string `json:"destinationName"`
		QAURL           string `json:"qaUrl"`
		ScrollCount     int    `json:"scrollCount"`
		MaxRetries      int    `json:"maxRetries"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		middleware.Error(w, 400, "Invalid JSON body")
		return
	}
	if req.Mode == "" {
		req.Mode = "list"
	}

	if !h.requireKernel(w) {
		return
	}

	ctx := r.Context()
	kernelSession, browserSession, err := h.createBrowserSession(ctx)
	if err != nil {
		middleware.Error(w, 500, "Failed to create browser session: "+err.Error())
		return
	}
	defer h.closeBrowserSession(ctx, kernelSession, browserSession)

	url := fmt.Sprintf("https://www.mafengwo.cn/wenda/area-%s.html", req.DestinationID)
	if req.QAURL != "" {
		url = req.QAURL
	}

	if err := browserSession.Navigate(url, 3000); err != nil {
		middleware.Error(w, 500, "Failed to navigate: "+err.Error())
		return
	}

	if req.ScrollCount <= 0 {
		req.ScrollCount = 5
	}
	if err := browserSession.ScrollToLoadMore(req.ScrollCount, 2000); err != nil {
		middleware.Error(w, 500, "Failed to scroll: "+err.Error())
		return
	}

	var result browser.QAListResult
	if err := browserSession.Evaluate(browser.JSExtractQAList, &result); err != nil {
		middleware.Error(w, 500, "Failed to extract QA: "+err.Error())
		return
	}

	slog.Info("问答列表爬取成功",
		"destinationId", req.DestinationID,
		"count", len(result.Questions),
	)

	// 为每个问答发送事件
	for _, qa := range result.Questions {
		h.EventBus.Publish(ctx, eventbus.Event{
			Topic: "crawler.mafengwo.qa.detail.completed",
			Data: map[string]any{
				"destinationId": req.DestinationID,
				"title":         qa.Title,
				"url":           qa.URL,
				"answerCount":   qa.AnswerCount,
			},
		})
	}

	middleware.JSON(w, 200, map[string]any{
		"success": true,
		"data": map[string]any{
			"destinationId": req.DestinationID,
			"questions":     result.Questions,
			"total":         len(result.Questions),
		},
	})
}

// POST /api/crawler/mafengwo/ranking — 爬取排行榜
func (h *Handler) HandleMafengwoRanking(w http.ResponseWriter, r *http.Request) {
	var req struct {
		DestinationID   string `json:"destinationId"`
		DestinationName string `json:"destinationName"`
		RankingType     string `json:"rankingType"`
		MaxRetries      int    `json:"maxRetries"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		middleware.Error(w, 400, "Invalid JSON body")
		return
	}
	if req.DestinationID == "" {
		middleware.Error(w, 400, "destinationId is required")
		return
	}
	if req.RankingType == "" {
		req.RankingType = "must_visit"
	}
	validTypes := map[string]bool{"must_visit": true, "food": true, "hotel": true, "shopping": true, "hidden_gem": true}
	if !validTypes[req.RankingType] {
		middleware.Error(w, 400, "Invalid rankingType")
		return
	}
	if req.MaxRetries <= 0 {
		req.MaxRetries = 3
	}

	if !h.requireKernel(w) {
		return
	}

	ctx := r.Context()
	kernelSession, browserSession, err := h.createBrowserSession(ctx)
	if err != nil {
		middleware.Error(w, 500, "Failed to create browser session: "+err.Error())
		return
	}
	defer h.closeBrowserSession(ctx, kernelSession, browserSession)

	// 排行榜类型到 URL 的映射
	rankingPaths := map[string]string{
		"must_visit": "jd",
		"food":       "cy",
		"hotel":      "jd",
		"shopping":   "gw",
		"hidden_gem": "jd",
	}
	path := rankingPaths[req.RankingType]

	url := fmt.Sprintf("https://www.mafengwo.cn/%s/%s/gonglve.html", path, req.DestinationID)
	if err := browserSession.Navigate(url, 5000); err != nil {
		middleware.Error(w, 500, "Failed to navigate: "+err.Error())
		return
	}

	var result browser.RankingResult
	if err := browserSession.Evaluate(browser.JSExtractRanking, &result); err != nil {
		middleware.Error(w, 500, "Failed to extract ranking: "+err.Error())
		return
	}

	slog.Info("排行榜爬取成功",
		"destinationId", req.DestinationID,
		"rankingType", req.RankingType,
		"count", len(result.Items),
	)

	h.EventBus.Publish(ctx, eventbus.Event{
		Topic: "crawler.mafengwo.ranking.completed",
		Data: map[string]any{
			"destinationId": req.DestinationID,
			"rankingType":   req.RankingType,
			"items":         result.Items,
		},
	})

	middleware.JSON(w, 200, map[string]any{
		"success": true,
		"data": map[string]any{
			"destinationId": req.DestinationID,
			"rankingType":   req.RankingType,
			"items":         result.Items,
			"total":         len(result.Items),
		},
	})
}

// POST /api/crawler/mafengwo/batch — 批量任务编排（纯编排，不需要浏览器）
func (h *Handler) HandleMafengwoBatch(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Destinations []struct {
			ID   string `json:"id"`
			Name string `json:"name"`
		} `json:"destinations"`
		DataTypes     []string `json:"dataTypes"`
		PoiCategories []string `json:"poiCategories"`
		RankingTypes  []string `json:"rankingTypes"`
		ScrollCount   int      `json:"scrollCount"`
		CrawlDetails  *bool    `json:"crawlDetails"`
		DetailsLimit  int      `json:"detailsLimit"`
		Priority      int      `json:"priority"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		middleware.Error(w, 400, "Invalid JSON body")
		return
	}
	if len(req.Destinations) == 0 || len(req.Destinations) > 50 {
		middleware.Error(w, 400, "1-50 destinations required")
		return
	}

	// Defaults
	if len(req.DataTypes) == 0 {
		req.DataTypes = []string{"destination", "travel_notes", "pois", "guides"}
	}
	if len(req.PoiCategories) == 0 {
		req.PoiCategories = []string{"attraction", "restaurant"}
	}
	if len(req.RankingTypes) == 0 {
		req.RankingTypes = []string{"must_visit", "food"}
	}
	if req.ScrollCount <= 0 {
		req.ScrollCount = 5
	}
	if req.DetailsLimit <= 0 {
		req.DetailsLimit = 20
	}
	if req.Priority <= 0 {
		req.Priority = 5
	}
	crawlDetails := true
	if req.CrawlDetails != nil {
		crawlDetails = *req.CrawlDetails
	}

	batchID := fmt.Sprintf("batch_%d", time.Now().UnixMilli())

	type CrawlTask struct {
		TaskType        string `json:"taskType"`
		DestinationID   string `json:"destinationId"`
		DestinationName string `json:"destinationName"`
		Priority        int    `json:"priority"`
		Category        string `json:"category,omitempty"`
		RankingType     string `json:"rankingType,omitempty"`
	}

	var tasks []CrawlTask

	// 标准化 dataType 名称（接受单复数形式）
	normalizeDataType := func(dt string) string {
		switch dt {
		case "poi", "pois":
			return "pois"
		case "guide", "guides":
			return "guides"
		case "ranking", "rankings":
			return "rankings"
		case "travel_note", "travel_notes":
			return "travel_notes"
		case "destination", "qa":
			return dt
		default:
			return ""
		}
	}

	// 验证所有 dataType
	for _, dt := range req.DataTypes {
		if normalizeDataType(dt) == "" {
			middleware.Error(w, 400, fmt.Sprintf("Invalid dataType: %q (valid: destination, travel_notes, pois, guides, qa, rankings)", dt))
			return
		}
	}

	for _, dest := range req.Destinations {
		for _, dt := range req.DataTypes {
			basePriority := req.Priority
			switch normalizeDataType(dt) {
			case "destination":
				tasks = append(tasks, CrawlTask{
					TaskType:        "destination_detail",
					DestinationID:   dest.ID,
					DestinationName: dest.Name,
					Priority:        basePriority + 2,
				})
			case "travel_notes":
				tasks = append(tasks, CrawlTask{
					TaskType:        "travel_note_list",
					DestinationID:   dest.ID,
					DestinationName: dest.Name,
					Priority:        basePriority,
				})
			case "pois":
				for _, cat := range req.PoiCategories {
					tasks = append(tasks, CrawlTask{
						TaskType:        "poi_list",
						DestinationID:   dest.ID,
						DestinationName: dest.Name,
						Priority:        basePriority - 1,
						Category:        cat,
					})
				}
			case "guides":
				tasks = append(tasks, CrawlTask{
					TaskType:        "guide_list",
					DestinationID:   dest.ID,
					DestinationName: dest.Name,
					Priority:        basePriority,
				})
			case "qa":
				tasks = append(tasks, CrawlTask{
					TaskType:        "qa_list",
					DestinationID:   dest.ID,
					DestinationName: dest.Name,
					Priority:        basePriority - 2,
				})
			case "rankings":
				for _, rt := range req.RankingTypes {
					tasks = append(tasks, CrawlTask{
						TaskType:        "ranking",
						DestinationID:   dest.ID,
						DestinationName: dest.Name,
						Priority:        basePriority - 1,
						RankingType:     rt,
					})
				}
			}
		}
	}

	_ = crawlDetails

	// Publish events
	h.EventBus.Publish(context.Background(), eventbus.Event{
		Topic: "crawler.mafengwo.batch.started",
		Data: map[string]any{
			"batchId":    batchID,
			"totalTasks": len(tasks),
		},
	})
	for _, task := range tasks {
		h.EventBus.Publish(context.Background(), eventbus.Event{
			Topic: "crawler.mafengwo.batch.task.created",
			Data:  task,
		})
	}

	slog.Info("Batch crawl created", "batchId", batchID, "tasks", len(tasks))

	middleware.JSON(w, 200, map[string]any{
		"success":    true,
		"batchId":    batchID,
		"totalTasks": len(tasks),
		"tasks":      tasks,
		"message":    fmt.Sprintf("Created %d crawl tasks for %d destinations", len(tasks), len(req.Destinations)),
	})
}
