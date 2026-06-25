package handler

import (
	"github.com/pathfinding/server/internal/browser"
	"github.com/pathfinding/server/internal/config"
	"github.com/pathfinding/server/internal/database"
	"github.com/pathfinding/server/internal/store"
)

// Handler holds shared dependencies for all HTTP handlers.
type Handler struct {
	DB     *database.DB
	Config *config.Config
	Kernel *browser.KernelClient // Kernel.sh 云浏览器客户端（KERNEL_API_KEY 为空时为 nil）
	Store  *store.Store          // mafengwo_* 暂存表类型化保存（DB 未配置时为 nil）
}

// New creates a new Handler.
func New(db *database.DB, cfg *config.Config) *Handler {
	h := &Handler{
		DB:     db,
		Config: cfg,
	}
	if cfg.KernelAPIKey != "" {
		h.Kernel = browser.NewKernelClient(cfg.KernelAPIKey)
	}
	if db != nil {
		h.Store = store.New(db)
	}
	return h
}
