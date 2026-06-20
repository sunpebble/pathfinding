package handler

import (
	"time"

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
	Batch  *BatchRunner          // 批量爬取任务队列（main 注入并启动；未配置时为 nil）

	// crawlInterval 是任务内连续详情爬取的限速间隔（CRAWLER_RATE_LIMIT_SECONDS）。
	crawlInterval time.Duration
	// sleep 可注入，便于测试限速逻辑。
	sleep func(time.Duration)
}

// New creates a new Handler.
func New(db *database.DB, cfg *config.Config) *Handler {
	h := &Handler{
		DB:     db,
		Config: cfg,
		sleep:  time.Sleep,
	}
	if cfg.CrawlerRateLimitSeconds > 0 {
		h.crawlInterval = time.Duration(cfg.CrawlerRateLimitSeconds) * time.Second
	}
	if cfg.KernelAPIKey != "" {
		h.Kernel = browser.NewKernelClient(cfg.KernelAPIKey)
	}
	if db != nil {
		h.Store = store.New(db)
	}
	return h
}
