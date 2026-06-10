// Package cron 实现爬虫自动化调度（设计 D12）。
//
// 任务：定期刷新 stale 暂存数据——取 mafengwo_guides 中 crawled_at 最旧的
// N 条（CRAWLER_REFRESH_BATCH）重抓详情，走类型化保存路径。
// 整体开关 CRAWLER_CRON_ENABLED 默认 false，避免误启动打爆配额。
//
// batch 队列消费不在 cron 内：BatchRunner（internal/handler）的消费
// goroutine 常驻运行，任务入队即被顺序消费，无需定时触发。
package cron

import (
	"context"
	"log/slog"
	"sync"
	"time"
)

// Config 是 cron 的运行配置（来自 CRAWLER_* env，见 internal/config）。
type Config struct {
	// Enabled 为 false 时 Start 只打一条「cron disabled」日志，不启动任何任务。
	Enabled bool
	// RefreshBatch 是每轮刷新的 stale 游记条数（CRAWLER_REFRESH_BATCH）。
	RefreshBatch int
	// RefreshInterval 是刷新任务的运行间隔（CRAWLER_REFRESH_INTERVAL_MINUTES）。
	RefreshInterval time.Duration
	// RateLimit 是同一轮内相邻两次重抓之间的限速间隔（CRAWLER_RATE_LIMIT_SECONDS）。
	RateLimit time.Duration
}

// StaleGuideLister 查询 crawled_at 最旧的游记 URL（store.GuideQueries 实现）。
type StaleGuideLister interface {
	StaleGuideURLs(ctx context.Context, limit int) ([]string, error)
}

// GuideRefresher 重抓单条游记详情并走保存路径（handler.Handler 实现）。
type GuideRefresher interface {
	RefreshGuideDetail(ctx context.Context, sourceURL string) error
}

// Manager manages periodic jobs.
type Manager struct {
	cfg       Config
	guides    StaleGuideLister
	refresher GuideRefresher
	done      chan struct{}
	wg        sync.WaitGroup
	sleep     func(time.Duration) // 可注入，测试限速逻辑用
}

// New creates a new cron manager.
// guides/refresher 允许为 nil（依赖未配置），Enabled 时缺依赖会在 Start 报错并拒绝启动。
func New(cfg Config, guides StaleGuideLister, refresher GuideRefresher) *Manager {
	return &Manager{
		cfg:       cfg,
		guides:    guides,
		refresher: refresher,
		done:      make(chan struct{}),
		sleep:     time.Sleep,
	}
}

// Start 启动定时任务并返回启动的任务数。
// 关闭或依赖缺失时返回 0，且原因必须可见（日志），绝不静默启动空壳。
func (m *Manager) Start() int {
	if !m.cfg.Enabled {
		slog.Info("cron disabled (CRAWLER_CRON_ENABLED=false)")
		return 0
	}
	if m.guides == nil || m.refresher == nil {
		slog.Error("cron enabled but dependencies missing — no jobs started",
			"hasGuideSource", m.guides != nil,
			"hasRefresher", m.refresher != nil,
		)
		return 0
	}
	if m.cfg.RefreshInterval <= 0 || m.cfg.RefreshBatch <= 0 {
		slog.Error("cron enabled but config invalid — no jobs started",
			"refreshInterval", m.cfg.RefreshInterval.String(),
			"refreshBatch", m.cfg.RefreshBatch,
		)
		return 0
	}

	m.wg.Add(1)
	go m.refreshLoop()

	slog.Info("cron started",
		"jobs", 1,
		"refreshInterval", m.cfg.RefreshInterval.String(),
		"refreshBatch", m.cfg.RefreshBatch,
		"rateLimit", m.cfg.RateLimit.String(),
	)
	return 1
}

func (m *Manager) refreshLoop() {
	defer m.wg.Done()

	ticker := time.NewTicker(m.cfg.RefreshInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			m.runRefresh(context.Background())
		case <-m.done:
			return
		}
	}
}

// runRefresh 执行一轮 stale 刷新，返回 (refreshed, failed) 计数。
// 单条失败不阻断其余条目，逐条 Error 日志保证失败可见。
func (m *Manager) runRefresh(ctx context.Context) (refreshed, failed int) {
	urls, err := m.guides.StaleGuideURLs(ctx, m.cfg.RefreshBatch)
	if err != nil {
		slog.Error("cron: stale guide query failed", "error", err)
		return 0, 0
	}
	if len(urls) == 0 {
		slog.Info("cron: no stale guides to refresh")
		return 0, 0
	}

	for i, sourceURL := range urls {
		if i > 0 && m.cfg.RateLimit > 0 {
			m.sleep(m.cfg.RateLimit)
		}
		if err := m.refresher.RefreshGuideDetail(ctx, sourceURL); err != nil {
			failed++
			slog.Error("cron: guide refresh failed", "url", sourceURL, "error", err)
			continue
		}
		refreshed++
	}

	slog.Info("cron: stale guide refresh finished",
		"batch", len(urls),
		"refreshed", refreshed,
		"failed", failed,
	)
	return refreshed, failed
}

// Stop gracefully stops all cron jobs.
func (m *Manager) Stop() {
	close(m.done)
	m.wg.Wait()
	slog.Info("cron stopped")
}
