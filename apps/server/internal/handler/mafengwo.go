package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"regexp"
	"sort"
	"time"

	"github.com/pathfinding/server/internal/browser"
	"github.com/pathfinding/server/internal/middleware"
)

// errDBNotConfigured 是 DB 未配置时透出到 HTTP 响应的保存失败原因。
const errDBNotConfigured = "database not configured"

// trySave 同步执行一次保存并返回 (saved, saveError)。
// 保存失败必须透出到 HTTP 响应（设计 D3），绝不只记日志。
func (h *Handler) trySave(ctx context.Context, dataType string, save func(context.Context) error) (bool, string) {
	if h.Store == nil {
		slog.Warn("DB 未配置，跳过保存", "dataType", dataType)
		return false, errDBNotConfigured
	}
	if err := save(ctx); err != nil {
		slog.Error("保存失败", "dataType", dataType, "error", err)
		return false, err.Error()
	}
	return true, ""
}

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

// mddIDPattern 校验马蜂窝目的地 ID（纯数字）。
var mddIDPattern = regexp.MustCompile(`^\d+$`)

// POST /api/crawler/mafengwo/list — 爬取游记列表页（设计 D10：city 真正生效）。
//
// 优先级：mddId（城市游记列表）→ city（站内搜索页）→ 全站 feed。
// 响应必须含 cityScoped 标志；全站 feed 为 false，调用方不得归属城市。
func (h *Handler) HandleMafengwoList(w http.ResponseWriter, r *http.Request) {
	var req struct {
		City        string `json:"city"`
		MddID       string `json:"mddId"`
		ScrollCount int    `json:"scrollCount"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		middleware.Error(w, 400, "Invalid JSON body")
		return
	}
	if req.MddID != "" && !mddIDPattern.MatchString(req.MddID) {
		middleware.Error(w, 400, "mddId must be numeric")
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

	slog.Info("正在爬取游记列表", "city", req.City, "mddId", req.MddID)

	result, err := h.crawlTravelNoteList(r.Context(), req.MddID, req.City, req.ScrollCount)
	if err != nil {
		slog.Error("游记列表爬取失败", "city", req.City, "mddId", req.MddID, "error", err)
		middleware.Error(w, 500, err.Error())
		return
	}

	slog.Info("游记列表爬取完成",
		"city", req.City,
		"mddId", req.MddID,
		"count", len(result.URLs),
		"cityScoped", result.CityScoped,
	)

	middleware.JSON(w, 200, map[string]any{
		"city":       req.City,
		"mddId":      req.MddID,
		"urls":       result.URLs,
		"total":      len(result.URLs),
		"cityScoped": result.CityScoped,
		"sourceUrl":  result.SourceURL,
	})
}

// POST /api/crawler/mafengwo/detail — 爬取游记详情页
func (h *Handler) HandleMafengwoDetail(w http.ResponseWriter, r *http.Request) {
	var req struct {
		URL        string `json:"url"`
		MaxRetries int    `json:"maxRetries"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		middleware.Error(w, 400, "Invalid JSON body")
		return
	}
	if req.URL == "" {
		middleware.Error(w, 400, "URL is required")
		return
	}

	if !h.requireKernel(w) {
		return
	}

	out, err := h.crawlGuideDetail(r.Context(), req.URL, req.MaxRetries, "", "")
	if err != nil {
		// 所有重试都失败：失败 URL 与原因必须返回给调用方（设计 D11）
		slog.Error("游记详情爬取失败（重试已用完）", "url", req.URL, "error", err)
		middleware.Error(w, 500, err.Error())
		return
	}

	middleware.JSON(w, 200, map[string]any{
		"url":              req.URL,
		"externalId":       out.ExternalID,
		"title":            out.Raw.Title,
		"content":          out.Content,
		"contentHtml":      out.Raw.ContentHTML,
		"contentMarkdown":  out.ContentMarkdown,
		"contentTruncated": out.ContentTruncated,
		"author":           out.Raw.Author,
		"views":            out.Views,
		"likes":            out.Likes,
		"viewsRaw":         out.Raw.Views,
		"likesRaw":         out.Raw.Likes,
		"coverImage":       out.Raw.CoverImage,
		"images":           out.Raw.Images,
		"publishedAt":      out.Raw.PublishedAt,
		"qualityScore":     out.QualityScore,
		"saved":            out.Saved,
		"saveError":        out.SaveError,
	})
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

	if !h.requireKernel(w) {
		return
	}

	out, err := h.crawlDestination(r.Context(), req.DestinationID, req.DestinationName, req.MaxRetries)
	if err != nil {
		slog.Error("目的地爬取失败", "destinationId", req.DestinationID, "error", err)
		middleware.Error(w, 500, err.Error())
		return
	}

	middleware.JSON(w, 200, map[string]any{
		"mddId":            out.Result.MddID,
		"name":             out.Result.Name,
		"nameEn":           out.Result.NameEn,
		"description":      out.Result.Description,
		"coverImage":       out.Result.CoverImage,
		"images":           out.Result.Images,
		"bestTravelTime":   out.Result.BestTravelTime,
		"travelNotesCount": out.Result.TravelNotesCount,
		"poisCount":        out.Result.PoisCount,
		"sourceUrl":        out.SourceURL,
		"saved":            out.Saved,
		"saveError":        out.SaveError,
	})
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

	if !h.requireKernel(w) {
		return
	}

	if req.Mode == "list" {
		result, err := h.crawlGuideListPage(r.Context(), req.DestinationID, req.ScrollCount)
		if err != nil {
			middleware.Error(w, 500, err.Error())
			return
		}

		slog.Info("攻略列表爬取成功", "destinationId", req.DestinationID, "count", len(result.Guides))

		middleware.JSON(w, 200, map[string]any{
			"destinationId": req.DestinationID,
			"guides":        result.Guides,
			"total":         len(result.Guides),
		})
		return
	}

	out, err := h.crawlGuideDetail(r.Context(), req.GuideURL, req.MaxRetries, req.DestinationID, req.DestinationName)
	if err != nil {
		slog.Error("攻略详情爬取失败", "url", req.GuideURL, "error", err)
		middleware.Error(w, 500, err.Error())
		return
	}

	middleware.JSON(w, 200, map[string]any{
		"url":              req.GuideURL,
		"guideId":          out.ExternalID,
		"title":            out.Raw.Title,
		"content":          out.Content,
		"contentTruncated": out.ContentTruncated,
		"author":           out.Raw.Author,
		"images":           out.Raw.Images,
		"views":            out.Views,
		"likes":            out.Likes,
		"viewsRaw":         out.Raw.Views,
		"likesRaw":         out.Raw.Likes,
		"publishedAt":      out.Raw.PublishedAt,
		"saved":            out.Saved,
		"saveError":        out.SaveError,
	})
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
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		middleware.Error(w, 400, "Invalid JSON body")
		return
	}
	if req.Category == "" {
		req.Category = "attraction"
	}
	if _, ok := poiCategoryPaths[req.Category]; !ok {
		middleware.Error(w, 400, "Invalid category")
		return
	}

	if !h.requireKernel(w) {
		return
	}

	out, err := h.crawlPOIList(r.Context(), req.DestinationID, req.DestinationName, req.Category, req.PoiURL, req.ScrollCount)
	if err != nil {
		middleware.Error(w, 500, err.Error())
		return
	}

	middleware.JSON(w, 200, map[string]any{
		"destinationId": req.DestinationID,
		"category":      req.Category,
		"pois":          out.POIs,
		"total":         len(out.POIs),
		"savedCount":    out.SavedCount,
		"saveErrors":    out.SaveErrors,
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
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		middleware.Error(w, 400, "Invalid JSON body")
		return
	}

	if !h.requireKernel(w) {
		return
	}

	out, err := h.crawlQAList(r.Context(), req.DestinationID, req.DestinationName, req.QAURL, req.ScrollCount)
	if err != nil {
		middleware.Error(w, 500, err.Error())
		return
	}

	middleware.JSON(w, 200, map[string]any{
		"destinationId": req.DestinationID,
		"questions":     out.Questions,
		"total":         len(out.Questions),
		"savedCount":    out.SavedCount,
		"saveErrors":    out.SaveErrors,
	})
}

// POST /api/crawler/mafengwo/ranking — 爬取排行榜
func (h *Handler) HandleMafengwoRanking(w http.ResponseWriter, r *http.Request) {
	var req struct {
		DestinationID   string `json:"destinationId"`
		DestinationName string `json:"destinationName"`
		RankingType     string `json:"rankingType"`
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
	if _, ok := rankingPaths[req.RankingType]; !ok {
		middleware.Error(w, 400, "Invalid rankingType")
		return
	}

	if !h.requireKernel(w) {
		return
	}

	out, err := h.crawlRanking(r.Context(), req.DestinationID, req.DestinationName, req.RankingType)
	if err != nil {
		middleware.Error(w, 500, err.Error())
		return
	}

	middleware.JSON(w, 200, map[string]any{
		"destinationId": req.DestinationID,
		"rankingType":   req.RankingType,
		"items":         out.Items,
		"total":         len(out.Items),
		"rankingId":     out.RankingID,
		"saved":         out.Saved,
		"saveError":     out.SaveError,
	})
}

// POST /api/crawler/mafengwo/batch — 批量任务编排（设计 D12）。
//
// 任务直接入队 BatchRunner 顺序执行（不再发布无人消费的 eventbus 事件）；
// 队列容量不足时整体拒绝并返回 503，执行状态可通过 statusUrl 查询。
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

	// 无浏览器服务时批量任务必然全部失败：直接 503，不制造「任务已创建」的假成功。
	if !h.requireKernel(w) {
		return
	}
	if h.Batch == nil {
		middleware.Error(w, 503, "Batch runner not configured")
		return
	}

	var tasks []CrawlTask
	for _, dest := range req.Destinations {
		for _, dt := range req.DataTypes {
			basePriority := req.Priority
			switch normalizeDataType(dt) {
			case "destination":
				tasks = append(tasks, CrawlTask{
					TaskType:        taskTypeDestinationDetail,
					DestinationID:   dest.ID,
					DestinationName: dest.Name,
					Priority:        basePriority + 2,
				})
			case "travel_notes":
				tasks = append(tasks, CrawlTask{
					TaskType:        taskTypeTravelNoteList,
					DestinationID:   dest.ID,
					DestinationName: dest.Name,
					Priority:        basePriority,
					ScrollCount:     req.ScrollCount,
					CrawlDetails:    crawlDetails,
					DetailsLimit:    req.DetailsLimit,
				})
			case "pois":
				for _, cat := range req.PoiCategories {
					tasks = append(tasks, CrawlTask{
						TaskType:        taskTypePOIList,
						DestinationID:   dest.ID,
						DestinationName: dest.Name,
						Priority:        basePriority - 1,
						Category:        cat,
						ScrollCount:     req.ScrollCount,
					})
				}
			case "guides":
				tasks = append(tasks, CrawlTask{
					TaskType:        taskTypeGuideList,
					DestinationID:   dest.ID,
					DestinationName: dest.Name,
					Priority:        basePriority,
					ScrollCount:     req.ScrollCount,
					CrawlDetails:    crawlDetails,
					DetailsLimit:    req.DetailsLimit,
				})
			case "qa":
				tasks = append(tasks, CrawlTask{
					TaskType:        taskTypeQAList,
					DestinationID:   dest.ID,
					DestinationName: dest.Name,
					Priority:        basePriority - 2,
					ScrollCount:     req.ScrollCount,
				})
			case "rankings":
				for _, rt := range req.RankingTypes {
					tasks = append(tasks, CrawlTask{
						TaskType:        taskTypeRanking,
						DestinationID:   dest.ID,
						DestinationName: dest.Name,
						Priority:        basePriority - 1,
						RankingType:     rt,
					})
				}
			}
		}
	}

	// 高优先级任务先执行（稳定排序保持同优先级的目的地顺序）
	sort.SliceStable(tasks, func(i, j int) bool { return tasks[i].Priority > tasks[j].Priority })

	batchID := fmt.Sprintf("batch_%d", time.Now().UnixMilli())
	if err := h.Batch.Enqueue(batchID, tasks); err != nil {
		slog.Error("批量任务入队失败", "batchId", batchID, "tasks", len(tasks), "error", err)
		middleware.Error(w, 503, "Failed to enqueue batch: "+err.Error())
		return
	}

	slog.Info("Batch crawl queued", "batchId", batchID, "tasks", len(tasks))

	middleware.JSON(w, 200, map[string]any{
		"batchId":    batchID,
		"totalTasks": len(tasks),
		"tasks":      tasks,
		"statusUrl":  "/api/crawler/mafengwo/batch/" + batchID,
		"message":    fmt.Sprintf("Queued %d crawl tasks for %d destinations", len(tasks), len(req.Destinations)),
	})
}

// GET /api/crawler/mafengwo/batch/{batchId} — 查询批量任务执行状态（设计 D12）。
func (h *Handler) HandleMafengwoBatchStatus(w http.ResponseWriter, r *http.Request) {
	batchID := r.PathValue("batchId")
	if batchID == "" {
		middleware.Error(w, 400, "batchId is required")
		return
	}
	if h.Batch == nil {
		middleware.Error(w, 503, "Batch runner not configured")
		return
	}

	status, ok := h.Batch.Status(batchID)
	if !ok {
		middleware.Error(w, 404, "batch not found: "+batchID)
		return
	}
	middleware.JSON(w, 200, status)
}
