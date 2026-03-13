package handler

import (
	"github.com/pathfinding/server/internal/browser"
	"github.com/pathfinding/server/internal/config"
	"github.com/pathfinding/server/internal/database"
	"github.com/pathfinding/server/internal/eventbus"
)

// Handler holds shared dependencies for all HTTP handlers.
type Handler struct {
	DB       *database.DB
	Config   *config.Config
	EventBus *eventbus.EventBus
	Kernel   *browser.KernelClient // Kernel.sh 云浏览器客户端（KERNEL_API_KEY 为空时为 nil）
}

// New creates a new Handler.
func New(db *database.DB, cfg *config.Config, bus *eventbus.EventBus) *Handler {
	h := &Handler{DB: db, Config: cfg, EventBus: bus}
	if cfg.KernelAPIKey != "" {
		h.Kernel = browser.NewKernelClient(cfg.KernelAPIKey)
	}
	return h
}
