package handler

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/pathfinding/server/internal/middleware"
)

// HandleHealth checks TiDB connection and Ollama reachability.
func (h *Handler) HandleHealth(w http.ResponseWriter, r *http.Request) {
	tidbStatus := "missing configuration"
	ollamaStatus := "not configured"

	// Check TiDB
	tidbConnected := false
	if h.Config.DatabaseURL != "" {
		if h.DB != nil {
			ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
			defer cancel()
			if err := h.DB.PingContext(ctx); err != nil {
				slog.Error("TiDB health check failed", "error", err)
				tidbStatus = "connection failed"
			} else {
				tidbConnected = true
				tidbStatus = "connected"
			}
		} else {
			tidbStatus = "connection failed"
		}
	}

	// Check Ollama
	if h.Config.OllamaBaseURL != "" {
		client := &http.Client{Timeout: 3 * time.Second}
		resp, err := client.Get(fmt.Sprintf("%s/api/tags", h.Config.OllamaBaseURL))
		if err == nil {
			resp.Body.Close()
			if resp.StatusCode == 200 {
				ollamaStatus = "connected"
			} else {
				ollamaStatus = "unreachable"
			}
		} else {
			ollamaStatus = "unreachable"
		}
	}

	status := 503
	statusText := "unhealthy"
	if tidbConnected {
		status = 200
		statusText = "healthy"
	}

	middleware.JSON(w, status, map[string]any{
		"status":    statusText,
		"service":   "pathfinding-server",
		"timestamp": time.Now().UTC().Format(time.RFC3339Nano),
		"checks": map[string]string{
			"tidb":   tidbStatus,
			"ollama": ollamaStatus,
		},
	})
}
