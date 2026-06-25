package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"regexp"

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
		"saved":            out.Saved,
		"saveError":        out.SaveError,
	})
}
