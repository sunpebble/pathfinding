package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/pathfinding/server/internal/middleware"
)

func (h *Handler) HandleAIChat(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Message string `json:"message"`
		Context string `json:"context,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		middleware.Error(w, 400, "Invalid JSON body")
		return
	}
	if req.Message == "" {
		middleware.Error(w, 400, "Message is required")
		return
	}

	systemPrompt := "你是一个专业的旅行助手。请用中文回答关于旅行规划、目的地推荐、行程安排等问题。"
	if req.Context != "" {
		systemPrompt += "\n\n上下文信息：" + req.Context
	}

	ollamaURL := fmt.Sprintf("%s/api/generate", h.Config.OllamaBaseURL)
	payload, _ := json.Marshal(map[string]any{
		"model":  h.Config.OllamaModel,
		"prompt": req.Message,
		"system": systemPrompt,
		"stream": false,
	})

	client := &http.Client{Timeout: 120 * time.Second}
	resp, err := client.Post(ollamaURL, "application/json", bytes.NewReader(payload))
	if err != nil {
		slog.Error("Ollama request failed", "error", err)
		middleware.Error(w, 503, "AI service unavailable")
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		middleware.Error(w, 503, fmt.Sprintf("Ollama API error: %d", resp.StatusCode))
		return
	}

	var result struct {
		Response string `json:"response"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		middleware.Error(w, 500, "Failed to parse AI response")
		return
	}

	middleware.JSON(w, 200, map[string]any{
		"success":  true,
		"response": result.Response,
	})
}
