package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	"github.com/pathfinding/server/internal/config"
	"github.com/pathfinding/server/internal/cron"
	"github.com/pathfinding/server/internal/database"
	"github.com/pathfinding/server/internal/eventbus"
	"github.com/pathfinding/server/internal/handler"
	"github.com/pathfinding/server/internal/middleware"
	"github.com/pathfinding/server/internal/store"
)

func main() {
	// Structured logging
	slog.SetDefault(slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})))

	slog.Info("Starting pathfinding server")

	// Load .env file (optional — not fatal if missing)
	if err := godotenv.Load(); err != nil {
		slog.Info("No .env file found, using environment variables")
	}

	// Load config
	cfg := config.Load()

	// Event bus
	bus := eventbus.New()

	// Database (optional — server can start without it)
	var db *database.DB
	if cfg.DatabaseURL != "" {
		var err error
		db, err = database.New(cfg.DatabaseURL)
		if err != nil {
			slog.Error("Failed to connect to database", "error", err)
			slog.Warn("Server will start without database — some features will be unavailable")
		} else {
			slog.Info("Connected to database")
		}
	} else {
		slog.Warn("DATABASE_URL not set — running without database")
	}

	// Handler
	h := handler.New(db, cfg, bus)

	// Register event handlers
	h.RegisterEventHandlers()

	// Batch crawl queue — 顺序消费 POST /batch 的任务（设计 D12）
	batchRunner := handler.NewBatchRunner(h.ExecuteCrawlTask, time.Duration(cfg.CrawlerRateLimitSeconds)*time.Second)
	h.Batch = batchRunner
	batchRunner.Start()

	// Cron jobs — stale 暂存数据刷新（设计 D12，CRAWLER_CRON_ENABLED 默认关闭）
	var staleGuides cron.StaleGuideLister
	if db != nil {
		staleGuides = store.NewGuideQueries(db)
	}
	var guideRefresher cron.GuideRefresher
	if h.Kernel != nil {
		guideRefresher = h
	}
	cronMgr := cron.New(cron.Config{
		Enabled:         cfg.CrawlerCronEnabled,
		RefreshBatch:    cfg.CrawlerRefreshBatch,
		RefreshInterval: time.Duration(cfg.CrawlerRefreshIntervalMinutes) * time.Minute,
		RateLimit:       time.Duration(cfg.CrawlerRateLimitSeconds) * time.Second,
	}, staleGuides, guideRefresher)
	cronMgr.Start()

	// Router
	mux := http.NewServeMux()

	// Health
	mux.HandleFunc("GET /health", h.HandleHealth)

	// Crawler
	mux.HandleFunc("POST /api/crawler/fetch", h.HandleCrawlerFetch)

	// Mafengwo crawlers
	mux.HandleFunc("POST /api/crawler/mafengwo/list", h.HandleMafengwoList)
	mux.HandleFunc("POST /api/crawler/mafengwo/detail", h.HandleMafengwoDetail)
	mux.HandleFunc("POST /api/crawler/mafengwo/destination", h.HandleMafengwoDestination)
	mux.HandleFunc("POST /api/crawler/mafengwo/guide", h.HandleMafengwoGuide)
	mux.HandleFunc("POST /api/crawler/mafengwo/poi", h.HandleMafengwoPOI)
	mux.HandleFunc("POST /api/crawler/mafengwo/qa", h.HandleMafengwoQA)
	mux.HandleFunc("POST /api/crawler/mafengwo/ranking", h.HandleMafengwoRanking)
	mux.HandleFunc("POST /api/crawler/mafengwo/batch", h.HandleMafengwoBatch)
	mux.HandleFunc("GET /api/crawler/mafengwo/batch/{batchId}", h.HandleMafengwoBatchStatus)

	// Weather
	mux.HandleFunc("GET /api/weather/forecast", h.HandleWeatherForecast)

	// Transport
	mux.HandleFunc("POST /api/transport/optimize", h.HandleTransportOptimize)

	// AI Chat
	mux.HandleFunc("POST /api/ai/chat", h.HandleAIChat)

	// Apply middleware
	var root http.Handler = mux
	root = middleware.RequestLogger(root)
	root = middleware.CORS(cfg.CORS.AllowedOrigins)(root)

	// Server
	srv := &http.Server{
		Addr:         cfg.Addr(),
		Handler:      root,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 120 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	go func() {
		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
		sig := <-sigCh
		slog.Info("Shutdown signal received", "signal", sig)

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		cronMgr.Stop()
		batchRunner.Stop()
		bus.Close()
		if db != nil {
			db.Close()
		}
		srv.Shutdown(ctx)
	}()

	slog.Info("Server listening", "addr", cfg.Addr())
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		slog.Error("Server failed", "error", err)
		os.Exit(1)
	}

	slog.Info("Server stopped")
}
