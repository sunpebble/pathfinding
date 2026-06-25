// crawl.go 提供马蜂窝游记列表/详情的可复用爬取助手，
// 抓取→清洗→类型化保存（设计 D3）共用一套逻辑，避免字段/行为漂移。
package handler

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/pathfinding/server/internal/browser"
	"github.com/pathfinding/server/internal/service"
	"github.com/pathfinding/server/internal/store"
)

// defaultMaxRetries 是详情爬取的默认重试次数。
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
	Views       *int
	Likes       *int
	PublishedAt *time.Time
	Saved       bool
	SaveError   string
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
		contentMarkdown := service.GenerateGuideMarkdownContent(result.Title, cleanedContent, result.Images)
		publishedAt := service.ParsePublishedDate(result.PublishedAt)

		// 同步保存到 mafengwo_guides 暂存表（设计 D2/D3：不写 travel_guides，不走事件总线）。
		// views_count/likes_count 列为 NOT NULL：解析失败时按列默认语义存 0，
		// 失败信号经 HTTP 响应的 views/likes=null + viewsRaw/likesRaw 透出（设计 D4）。
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
				PublishedAt:     publishedAt,
			})
		})

		slog.Info("游记详情爬取成功",
			"url", sourceURL,
			"title", result.Title,
			"contentLen", len(cleanedContent),
			"images", len(result.Images),
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
