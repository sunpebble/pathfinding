package handler

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/pathfinding/server/internal/middleware"
)

type weatherCacheEntry struct {
	data      map[string]any
	timestamp time.Time
}

var (
	weatherCache    = sync.Map{}
	weatherCacheTTL = 30 * time.Minute
)

func (h *Handler) HandleWeatherForecast(w http.ResponseWriter, r *http.Request) {
	latStr := r.URL.Query().Get("lat")
	lonStr := r.URL.Query().Get("lon")

	lat, errLat := strconv.ParseFloat(latStr, 64)
	lon, errLon := strconv.ParseFloat(lonStr, 64)

	if errLat != nil || errLon != nil || lat < -90 || lat > 90 || lon < -180 || lon > 180 {
		middleware.Error(w, 400, "Valid lat and lon required")
		return
	}

	apiKey := h.Config.OpenWeatherMapAPIKey
	if apiKey == "" {
		middleware.Error(w, 503, "OpenWeatherMap API key not configured")
		return
	}

	// Check cache
	cacheKey := fmt.Sprintf("%.2f,%.2f", lat, lon)
	if entry, ok := weatherCache.Load(cacheKey); ok {
		e := entry.(*weatherCacheEntry)
		if time.Since(e.timestamp) < weatherCacheTTL {
			result := make(map[string]any)
			for k, v := range e.data {
				result[k] = v
			}
			result["cached"] = true
			middleware.JSON(w, 200, map[string]any{"data": result})
			return
		}
	}

	// Fetch from OpenWeatherMap
	url := fmt.Sprintf("https://api.openweathermap.org/data/3.0/onecall?lat=%f&lon=%f&appid=%s&units=metric&lang=zh_cn", lat, lon, apiKey)
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		slog.Error("Weather fetch failed", "error", err)
		middleware.Error(w, 503, "Weather service unavailable")
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		middleware.Error(w, 503, fmt.Sprintf("OpenWeatherMap API error: %d", resp.StatusCode))
		return
	}

	var data map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		middleware.Error(w, 500, "Failed to parse weather data")
		return
	}

	// Cache it
	weatherCache.Store(cacheKey, &weatherCacheEntry{data: data, timestamp: time.Now()})

	data["cached"] = false
	middleware.JSON(w, 200, map[string]any{"data": data})
}
