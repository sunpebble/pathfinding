package handler

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"time"

	"github.com/pathfinding/server/internal/eventbus"
	"github.com/pathfinding/server/internal/middleware"
	"github.com/pathfinding/server/internal/service"
)

func (h *Handler) HandleCrawlerFetch(w http.ResponseWriter, r *http.Request) {
	var req struct {
		URL string `json:"url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		middleware.Error(w, 400, "Invalid JSON body")
		return
	}
	if _, err := url.ParseRequestURI(req.URL); err != nil || req.URL == "" {
		middleware.Error(w, 400, "Valid URL required")
		return
	}

	slog.Info("Crawling", "url", req.URL)

	// HTTP fetch
	client := &http.Client{Timeout: 30 * time.Second}
	httpReq, _ := http.NewRequestWithContext(r.Context(), "GET", req.URL, nil)
	httpReq.Header.Set("User-Agent", "Mozilla/5.0 (compatible; TravelBot/1.0)")

	resp, err := client.Do(httpReq)
	if err != nil {
		middleware.JSON(w, 200, map[string]any{
			"success":  false,
			"error":    err.Error(),
			"platform": "unknown",
		})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		middleware.JSON(w, 200, map[string]any{
			"success":  false,
			"error":    "HTTP " + resp.Status,
			"platform": "unknown",
		})
		return
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		middleware.JSON(w, 200, map[string]any{
			"success":  false,
			"error":    err.Error(),
			"platform": "unknown",
		})
		return
	}

	html := string(body)
	content, contentTruncated := service.CleanContent(html, 10000)
	title := service.ExtractTitle(html)
	platform := service.DetectPlatform(req.URL)

	data := map[string]any{
		"url":              req.URL,
		"title":            title,
		"content":          content,
		"contentTruncated": contentTruncated,
	}

	// Publish event
	h.EventBus.Publish(context.Background(), eventbus.Event{
		Topic: "crawler.result.received",
		Data: map[string]any{
			"url":      req.URL,
			"platform": platform,
			"content":  data,
		},
	})

	middleware.JSON(w, 200, map[string]any{
		"success":  true,
		"platform": platform,
		"data":     data,
	})
}
