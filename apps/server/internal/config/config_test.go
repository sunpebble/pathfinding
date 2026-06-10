package config

import "testing"

func TestLoad_CrawlerDefaults(t *testing.T) {
	// Arrange: 清空相关 env（t.Setenv 自动在测试结束后恢复）
	t.Setenv("CRAWLER_CRON_ENABLED", "")
	t.Setenv("CRAWLER_REFRESH_BATCH", "")
	t.Setenv("CRAWLER_REFRESH_INTERVAL_MINUTES", "")
	t.Setenv("CRAWLER_RATE_LIMIT_SECONDS", "")

	// Act
	cfg := Load()

	// Assert: cron 必须默认关闭（设计 D12），限速默认 3 秒
	if cfg.CrawlerCronEnabled {
		t.Error("CRAWLER_CRON_ENABLED 默认必须为 false")
	}
	if cfg.CrawlerRefreshBatch != 10 {
		t.Errorf("CRAWLER_REFRESH_BATCH 默认应为 10, got %d", cfg.CrawlerRefreshBatch)
	}
	if cfg.CrawlerRefreshIntervalMinutes != 1440 {
		t.Errorf("CRAWLER_REFRESH_INTERVAL_MINUTES 默认应为 1440, got %d", cfg.CrawlerRefreshIntervalMinutes)
	}
	if cfg.CrawlerRateLimitSeconds != 3 {
		t.Errorf("CRAWLER_RATE_LIMIT_SECONDS 默认应为 3, got %d", cfg.CrawlerRateLimitSeconds)
	}
}

func TestLoad_CrawlerEnvOverrides(t *testing.T) {
	// Arrange
	t.Setenv("CRAWLER_CRON_ENABLED", "true")
	t.Setenv("CRAWLER_REFRESH_BATCH", "25")
	t.Setenv("CRAWLER_REFRESH_INTERVAL_MINUTES", "60")
	t.Setenv("CRAWLER_RATE_LIMIT_SECONDS", "5")

	// Act
	cfg := Load()

	// Assert
	if !cfg.CrawlerCronEnabled {
		t.Error("CRAWLER_CRON_ENABLED=true 应解析为 true")
	}
	if cfg.CrawlerRefreshBatch != 25 {
		t.Errorf("CRAWLER_REFRESH_BATCH 应为 25, got %d", cfg.CrawlerRefreshBatch)
	}
	if cfg.CrawlerRefreshIntervalMinutes != 60 {
		t.Errorf("CRAWLER_REFRESH_INTERVAL_MINUTES 应为 60, got %d", cfg.CrawlerRefreshIntervalMinutes)
	}
	if cfg.CrawlerRateLimitSeconds != 5 {
		t.Errorf("CRAWLER_RATE_LIMIT_SECONDS 应为 5, got %d", cfg.CrawlerRateLimitSeconds)
	}
}

func TestLoad_InvalidCrawlerEnvFallsBack(t *testing.T) {
	// Arrange: 非法值不应使进程崩溃，也不应静默接受（Warn 日志 + 默认值）
	t.Setenv("CRAWLER_CRON_ENABLED", "not-a-bool")
	t.Setenv("CRAWLER_REFRESH_BATCH", "abc")
	t.Setenv("CRAWLER_RATE_LIMIT_SECONDS", "-1")

	// Act
	cfg := Load()

	// Assert
	if cfg.CrawlerCronEnabled {
		t.Error("非法布尔值应回退为默认 false")
	}
	if cfg.CrawlerRefreshBatch != 10 {
		t.Errorf("非法整数应回退为默认 10, got %d", cfg.CrawlerRefreshBatch)
	}
	if cfg.CrawlerRateLimitSeconds != 3 {
		t.Errorf("非正整数应回退为默认 3, got %d", cfg.CrawlerRateLimitSeconds)
	}
}
