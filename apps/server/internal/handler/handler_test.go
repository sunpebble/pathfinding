package handler_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/pathfinding/server/internal/config"
	"github.com/pathfinding/server/internal/handler"
)

// newTestHandler creates a Handler with no DB and no Kernel.
func newTestHandler() *handler.Handler {
	cfg := &config.Config{
		Port:          3000,
		OllamaBaseURL: "http://localhost:11434",
		OllamaModel:   "gemma3:4b",
	}
	return handler.New(nil, cfg)
}

// apiResponse is the generic JSON response wrapper.
type apiResponse struct {
	Success bool            `json:"success"`
	Data    json.RawMessage `json:"data,omitempty"`
	Error   string          `json:"error,omitempty"`
}

// doRequest performs a test HTTP request and returns the recorder.
func doRequest(t *testing.T, method, path string, body any, handlerFunc http.HandlerFunc) *httptest.ResponseRecorder {
	t.Helper()
	var buf bytes.Buffer
	if body != nil {
		if err := json.NewEncoder(&buf).Encode(body); err != nil {
			t.Fatalf("failed to encode request body: %v", err)
		}
	}
	req := httptest.NewRequest(method, path, &buf)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	w := httptest.NewRecorder()
	handlerFunc(w, req)
	return w
}

// parseResponse decodes the response body into an apiResponse.
func parseResponse(t *testing.T, w *httptest.ResponseRecorder) apiResponse {
	t.Helper()
	var resp apiResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode response: %v (body: %s)", err, w.Body.String())
	}
	return resp
}

// =======================================================================
// Health endpoint
// =======================================================================

func TestHandleHealth_NoDB(t *testing.T) {
	h := newTestHandler()
	w := doRequest(t, "GET", "/health", nil, h.HandleHealth)

	if w.Code != http.StatusServiceUnavailable {
		t.Errorf("expected status 503, got %d", w.Code)
	}

	resp := parseResponse(t, w)
	if !resp.Success {
		t.Errorf("expected success=true (JSON wrapper), got false")
	}

	// Parse inner data
	var data struct {
		Status string            `json:"status"`
		Checks map[string]string `json:"checks"`
	}
	if err := json.Unmarshal(resp.Data, &data); err != nil {
		t.Fatalf("failed to decode health data: %v", err)
	}
	if data.Status != "unhealthy" {
		t.Errorf("expected status=unhealthy, got %q", data.Status)
	}
	if data.Checks["tidb"] != "missing configuration" {
		t.Errorf("expected tidb check='missing configuration', got %q", data.Checks["tidb"])
	}
}

// =======================================================================
// Crawler Fetch endpoint
// =======================================================================

func TestHandleCrawlerFetch_InvalidJSON(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest("POST", "/api/crawler/fetch", bytes.NewBufferString("not json"))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.HandleCrawlerFetch(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
	resp := parseResponse(t, w)
	if resp.Success {
		t.Error("expected success=false for invalid JSON")
	}
}

func TestHandleCrawlerFetch_EmptyURL(t *testing.T) {
	h := newTestHandler()
	w := doRequest(t, "POST", "/api/crawler/fetch",
		map[string]string{"url": ""},
		h.HandleCrawlerFetch)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestHandleCrawlerFetch_InvalidURL(t *testing.T) {
	h := newTestHandler()
	w := doRequest(t, "POST", "/api/crawler/fetch",
		map[string]string{"url": "not-a-url"},
		h.HandleCrawlerFetch)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

// =======================================================================
// Transport Optimize endpoint
// =======================================================================

func TestHandleTransportOptimize_InvalidJSON(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest("POST", "/api/transport/optimize", bytes.NewBufferString("{bad"))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.HandleTransportOptimize(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestHandleTransportOptimize_EmptyPOIs(t *testing.T) {
	h := newTestHandler()
	w := doRequest(t, "POST", "/api/transport/optimize",
		map[string]any{"pois": []any{}, "transportMode": "walking"},
		h.HandleTransportOptimize)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestHandleTransportOptimize_InvalidMode(t *testing.T) {
	h := newTestHandler()
	w := doRequest(t, "POST", "/api/transport/optimize",
		map[string]any{
			"pois":          []map[string]any{{"name": "A", "latitude": 39.9, "longitude": 116.4}},
			"transportMode": "flying",
		},
		h.HandleTransportOptimize)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestHandleTransportOptimize_SinglePOI(t *testing.T) {
	h := newTestHandler()
	w := doRequest(t, "POST", "/api/transport/optimize",
		map[string]any{
			"pois": []map[string]any{
				{"name": "故宫", "latitude": 39.9163, "longitude": 116.3972},
			},
			"transportMode": "walking",
		},
		h.HandleTransportOptimize)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d; body: %s", w.Code, w.Body.String())
	}

	resp := parseResponse(t, w)
	if !resp.Success {
		t.Error("expected success=true")
	}

	var data struct {
		OptimizedOrder []int `json:"optimizedOrder"`
		Segments       []any `json:"segments"`
	}
	if err := json.Unmarshal(resp.Data, &data); err != nil {
		t.Fatalf("failed to decode transport data: %v", err)
	}
	if len(data.OptimizedOrder) != 1 {
		t.Errorf("expected 1 POI in optimized order, got %d", len(data.OptimizedOrder))
	}
}

func TestHandleTransportOptimize_MultiplePOIs(t *testing.T) {
	h := newTestHandler()
	w := doRequest(t, "POST", "/api/transport/optimize",
		map[string]any{
			"pois": []map[string]any{
				{"name": "故宫", "latitude": 39.9163, "longitude": 116.3972},
				{"name": "天坛", "latitude": 39.8822, "longitude": 116.4066},
				{"name": "颐和园", "latitude": 39.9999, "longitude": 116.2755},
			},
			"transportMode": "driving",
		},
		h.HandleTransportOptimize)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d; body: %s", w.Code, w.Body.String())
	}

	resp := parseResponse(t, w)
	var data struct {
		OptimizedOrder []int `json:"optimizedOrder"`
		Segments       []any `json:"segments"`
		Savings        any   `json:"savings"`
	}
	if err := json.Unmarshal(resp.Data, &data); err != nil {
		t.Fatalf("failed to decode: %v", err)
	}
	if len(data.OptimizedOrder) != 3 {
		t.Errorf("expected 3 POIs in order, got %d", len(data.OptimizedOrder))
	}
	if len(data.Segments) != 2 {
		t.Errorf("expected 2 segments, got %d", len(data.Segments))
	}
}

// =======================================================================
// Weather endpoint
// =======================================================================

func TestHandleWeatherForecast_MissingParams(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest("GET", "/api/weather/forecast", nil)
	w := httptest.NewRecorder()
	h.HandleWeatherForecast(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestHandleWeatherForecast_InvalidLat(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest("GET", "/api/weather/forecast?lat=999&lon=116.4", nil)
	w := httptest.NewRecorder()
	h.HandleWeatherForecast(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestHandleWeatherForecast_NoAPIKey(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest("GET", "/api/weather/forecast?lat=39.9&lon=116.4", nil)
	w := httptest.NewRecorder()
	h.HandleWeatherForecast(w, req)

	if w.Code != http.StatusServiceUnavailable {
		t.Errorf("expected 503, got %d", w.Code)
	}
	resp := parseResponse(t, w)
	if resp.Error == "" {
		t.Error("expected error message for missing API key")
	}
}

// =======================================================================
// AI Chat endpoint
// =======================================================================

func TestHandleAIChat_InvalidJSON(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest("POST", "/api/ai/chat", bytes.NewBufferString("oops"))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.HandleAIChat(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestHandleAIChat_EmptyMessage(t *testing.T) {
	h := newTestHandler()
	w := doRequest(t, "POST", "/api/ai/chat",
		map[string]string{"message": ""},
		h.HandleAIChat)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

// =======================================================================
// Mafengwo endpoints — requireKernel gate (returns 503 without KERNEL_API_KEY)
// =======================================================================

func TestMafengwo_RequireKernel(t *testing.T) {
	h := newTestHandler() // No Kernel configured

	tests := []struct {
		name    string
		handler http.HandlerFunc
		body    any
	}{
		{
			name:    "list",
			handler: h.HandleMafengwoList,
			body:    map[string]any{"city": "北京"},
		},
		{
			name:    "detail",
			handler: h.HandleMafengwoDetail,
			body:    map[string]any{"url": "https://www.mafengwo.cn/i/123.html"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := doRequest(t, "POST", "/test", tt.body, tt.handler)

			if w.Code != http.StatusServiceUnavailable {
				t.Errorf("expected 503, got %d (body: %s)", w.Code, w.Body.String())
			}
			resp := parseResponse(t, w)
			if resp.Success {
				t.Error("expected success=false")
			}
			if resp.Error != "Browser service not configured" {
				t.Errorf("expected 'Browser service not configured', got %q", resp.Error)
			}
		})
	}
}

// =======================================================================
// Mafengwo validation tests (before requireKernel gate)
// =======================================================================

func TestMafengwoList_Validation(t *testing.T) {
	h := newTestHandler()

	t.Run("invalid JSON", func(t *testing.T) {
		req := httptest.NewRequest("POST", "/test", bytes.NewBufferString("bad"))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		h.HandleMafengwoList(w, req)
		if w.Code != http.StatusBadRequest {
			t.Errorf("expected 400, got %d", w.Code)
		}
	})

	t.Run("non-numeric mddId", func(t *testing.T) {
		w := doRequest(t, "POST", "/test", map[string]any{"mddId": "abc123"}, h.HandleMafengwoList)
		if w.Code != http.StatusBadRequest {
			t.Errorf("expected 400, got %d", w.Code)
		}
	})

	t.Run("empty city falls back to global feed", func(t *testing.T) {
		// 设计 D10：空 city/mddId 不再是参数错误，而是回退全站 feed
		// （cityScoped=false）。测试环境无 Kernel，请求应止步于浏览器
		// 服务检查（503），而非 400。
		w := doRequest(t, "POST", "/test", map[string]any{"city": ""}, h.HandleMafengwoList)
		if w.Code != http.StatusServiceUnavailable {
			t.Errorf("expected 503 (kernel gate, not validation), got %d", w.Code)
		}
	})
}

func TestMafengwoDetail_Validation(t *testing.T) {
	h := newTestHandler()

	t.Run("empty URL", func(t *testing.T) {
		w := doRequest(t, "POST", "/test", map[string]any{"url": ""}, h.HandleMafengwoDetail)
		if w.Code != http.StatusBadRequest {
			t.Errorf("expected 400, got %d", w.Code)
		}
	})
}

// =======================================================================
// Response format consistency
// =======================================================================

func TestResponseFormat_Error(t *testing.T) {
	h := newTestHandler()

	// Any error response should have {success: false, error: "..."}
	w := doRequest(t, "POST", "/test", map[string]any{}, h.HandleCrawlerFetch)
	resp := parseResponse(t, w)

	if resp.Success {
		t.Error("error responses should have success=false")
	}
	if resp.Error == "" {
		t.Error("error responses should have non-empty error message")
	}
}

func TestResponseFormat_Success(t *testing.T) {
	h := newTestHandler()

	// Transport optimize should return {success: true, data: {...}}
	w := doRequest(t, "POST", "/api/transport/optimize",
		map[string]any{
			"pois": []map[string]any{
				{"name": "A", "latitude": 39.9, "longitude": 116.4},
			},
			"transportMode": "walking",
		},
		h.HandleTransportOptimize)

	resp := parseResponse(t, w)
	if !resp.Success {
		t.Error("success responses should have success=true")
	}
	if resp.Data == nil {
		t.Error("success responses should have non-nil data")
	}
}

func TestContentTypeHeader(t *testing.T) {
	h := newTestHandler()

	// All responses should have JSON content type
	w := doRequest(t, "GET", "/health", nil, h.HandleHealth)
	ct := w.Header().Get("Content-Type")
	if ct != "application/json; charset=utf-8" {
		t.Errorf("expected Content-Type 'application/json; charset=utf-8', got %q", ct)
	}
}
