package config

import (
	"fmt"
	"log/slog"
	"os"
	"strconv"
)

type Config struct {
	Port int
	CORS CORSConfig

	DatabaseURL string

	KernelAPIKey string

	OllamaBaseURL string
	OllamaModel   string

	OpenWeatherMapAPIKey string

	OpenAIAPIKey  string
	OpenAIModel   string
	OpenAIBaseURL string

	// 爬虫调度（设计 D12）：cron 默认关闭，避免误启动打爆配额。
	CrawlerCronEnabled            bool
	CrawlerRefreshBatch           int
	CrawlerRefreshIntervalMinutes int
	CrawlerRateLimitSeconds       int
}

type CORSConfig struct {
	AllowedOrigins []string
}

func Load() *Config {
	port, _ := strconv.Atoi(getEnv("PORT", "3000"))

	return &Config{
		Port: port,
		CORS: CORSConfig{
			AllowedOrigins: []string{
				"http://localhost:3002",
				"http://localhost:3000",
			},
		},

		DatabaseURL: getEnv("DATABASE_URL", ""),

		KernelAPIKey: getEnv("KERNEL_API_KEY", ""),

		OllamaBaseURL: getEnv("OLLAMA_BASE_URL", "http://localhost:11434"),
		OllamaModel:   getEnv("OLLAMA_MODEL", "gemma3:latest"),

		OpenWeatherMapAPIKey: getEnv("OPENWEATHERMAP_API_KEY", ""),

		OpenAIAPIKey:  getEnv("OPENAI_API_KEY", ""),
		OpenAIModel:   getEnv("OPENAI_MODEL", ""),
		OpenAIBaseURL: getEnv("OPENAI_BASE_URL", ""),

		CrawlerCronEnabled:            getEnvBool("CRAWLER_CRON_ENABLED", false),
		CrawlerRefreshBatch:           getEnvInt("CRAWLER_REFRESH_BATCH", 10),
		CrawlerRefreshIntervalMinutes: getEnvInt("CRAWLER_REFRESH_INTERVAL_MINUTES", 1440),
		CrawlerRateLimitSeconds:       getEnvInt("CRAWLER_RATE_LIMIT_SECONDS", 3),
	}
}

func (c *Config) Addr() string {
	return fmt.Sprintf(":%d", c.Port)
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// getEnvBool 解析布尔 env；非法值打 Warn 日志并使用默认值（失败可见，不静默）。
func getEnvBool(key string, fallback bool) bool {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	b, err := strconv.ParseBool(v)
	if err != nil {
		slog.Warn("invalid boolean env value, using fallback", "key", key, "value", v, "fallback", fallback)
		return fallback
	}
	return b
}

// getEnvInt 解析整数 env；非法或非正值打 Warn 日志并使用默认值。
func getEnvInt(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil || n <= 0 {
		slog.Warn("invalid integer env value, using fallback", "key", key, "value", v, "fallback", fallback)
		return fallback
	}
	return n
}
