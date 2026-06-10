package cron

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"
)

// =============================================================================
// 测试桩
// =============================================================================

type fakeLister struct {
	urls     []string
	err      error
	gotLimit int
}

func (f *fakeLister) StaleGuideURLs(_ context.Context, limit int) ([]string, error) {
	f.gotLimit = limit
	if f.err != nil {
		return nil, f.err
	}
	return f.urls, nil
}

type fakeRefresher struct {
	mu     sync.Mutex
	calls  []string
	failOn map[string]error
	notify chan string
}

func (f *fakeRefresher) RefreshGuideDetail(_ context.Context, sourceURL string) error {
	f.mu.Lock()
	f.calls = append(f.calls, sourceURL)
	f.mu.Unlock()
	if f.notify != nil {
		f.notify <- sourceURL
	}
	if err := f.failOn[sourceURL]; err != nil {
		return err
	}
	return nil
}

func enabledConfig() Config {
	return Config{
		Enabled:         true,
		RefreshBatch:    10,
		RefreshInterval: time.Hour,
		RateLimit:       3 * time.Second,
	}
}

// =============================================================================
// 开关（CRAWLER_CRON_ENABLED 默认 false）
// =============================================================================

func TestStart_DisabledStartsNothing(t *testing.T) {
	// Arrange: 开关关闭（默认值）
	m := New(Config{Enabled: false}, &fakeLister{}, &fakeRefresher{})

	// Act
	jobs := m.Start()

	// Assert: 只打日志，不启动任何任务
	if jobs != 0 {
		t.Errorf("关闭时不应启动任何任务, got %d", jobs)
	}
	m.Stop()
}

func TestStart_EnabledMissingDepsStartsNothing(t *testing.T) {
	// Arrange: 开关打开但 DB/浏览器依赖缺失
	m := New(enabledConfig(), nil, nil)

	// Act
	jobs := m.Start()

	// Assert: 拒绝启动（错误可见于日志），不静默跑空壳
	if jobs != 0 {
		t.Errorf("依赖缺失时不应启动任务, got %d", jobs)
	}
	m.Stop()
}

func TestStart_InvalidConfigStartsNothing(t *testing.T) {
	// Arrange: interval 非法（ticker 会 panic，必须前置拒绝）
	cfg := enabledConfig()
	cfg.RefreshInterval = 0
	m := New(cfg, &fakeLister{}, &fakeRefresher{})

	// Act
	jobs := m.Start()

	// Assert
	if jobs != 0 {
		t.Errorf("非法配置不应启动任务, got %d", jobs)
	}
	m.Stop()
}

func TestStart_EnabledRunsRefreshOnTicker(t *testing.T) {
	// Arrange: 短间隔 ticker，验证任务真实运行
	cfg := enabledConfig()
	cfg.RefreshInterval = 10 * time.Millisecond
	cfg.RateLimit = 0
	refresher := &fakeRefresher{notify: make(chan string, 16)}
	m := New(cfg, &fakeLister{urls: []string{"https://m.mafengwo.cn/i/1.html"}}, refresher)

	// Act
	if jobs := m.Start(); jobs != 1 {
		t.Fatalf("应启动 1 个任务, got %d", jobs)
	}
	defer m.Stop()

	// Assert: 在超时前至少触发一次刷新
	select {
	case url := <-refresher.notify:
		if url != "https://m.mafengwo.cn/i/1.html" {
			t.Errorf("刷新 URL 不符, got %s", url)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("ticker 触发刷新超时")
	}
}

// =============================================================================
// runRefresh：批次大小、限速、失败可见
// =============================================================================

func TestRunRefresh_RateLimitAndFailureCounts(t *testing.T) {
	// Arrange: 3 条 stale，第二条刷新失败
	lister := &fakeLister{urls: []string{"u1", "u2", "u3"}}
	refresher := &fakeRefresher{failOn: map[string]error{"u2": errors.New("blocked")}}
	cfg := enabledConfig()
	cfg.RefreshBatch = 3
	m := New(cfg, lister, refresher)

	var sleeps []time.Duration
	m.sleep = func(d time.Duration) { sleeps = append(sleeps, d) }

	// Act
	refreshed, failed := m.runRefresh(context.Background())

	// Assert: 限制条数传给查询、失败不阻断、计数准确
	if lister.gotLimit != 3 {
		t.Errorf("应按 RefreshBatch=3 查询, got %d", lister.gotLimit)
	}
	if refreshed != 2 || failed != 1 {
		t.Errorf("应 2 成功 1 失败, got refreshed=%d failed=%d", refreshed, failed)
	}
	if len(refresher.calls) != 3 {
		t.Errorf("3 条都应尝试刷新, got %d", len(refresher.calls))
	}
	// 限速：3 条之间应有 2 次 sleep，每次为 RateLimit
	if len(sleeps) != 2 {
		t.Fatalf("应有 2 次限速 sleep, got %d", len(sleeps))
	}
	for i, d := range sleeps {
		if d != cfg.RateLimit {
			t.Errorf("第 %d 次 sleep 应为 %v, got %v", i, cfg.RateLimit, d)
		}
	}
}

func TestRunRefresh_QueryErrorVisible(t *testing.T) {
	// Arrange: 查询失败必须中止本轮且不调用刷新
	lister := &fakeLister{err: errors.New("connection lost")}
	refresher := &fakeRefresher{}
	m := New(enabledConfig(), lister, refresher)

	// Act
	refreshed, failed := m.runRefresh(context.Background())

	// Assert
	if refreshed != 0 || failed != 0 {
		t.Errorf("查询失败时计数应为 0, got %d/%d", refreshed, failed)
	}
	if len(refresher.calls) != 0 {
		t.Errorf("查询失败时不应调用刷新, got %d", len(refresher.calls))
	}
}

func TestRunRefresh_EmptyStaleSet(t *testing.T) {
	// Arrange
	m := New(enabledConfig(), &fakeLister{urls: nil}, &fakeRefresher{})

	// Act
	refreshed, failed := m.runRefresh(context.Background())

	// Assert
	if refreshed != 0 || failed != 0 {
		t.Errorf("无 stale 数据时计数应为 0, got %d/%d", refreshed, failed)
	}
}
