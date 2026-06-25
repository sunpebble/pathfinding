package config

import (
	"fmt"
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
