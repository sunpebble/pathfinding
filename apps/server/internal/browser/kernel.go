package browser

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
)

const kernelBaseURL = "https://api.onkernel.com"

// CreateSessionOptions 是创建浏览器会话时的可选参数。
type CreateSessionOptions struct {
	Stealth        bool // 是否启用隐身模式，默认为 true
	Headless       bool // 是否使用无头模式，默认为 false（非无头模式可绕过 WAF）
	TimeoutSeconds int  // 会话超时时间（秒），默认为 120
}

// KernelSession 表示 Kernel.sh 返回的浏览器会话信息。
type KernelSession struct {
	SessionID   string `json:"session_id"`
	CdpWsURL    string `json:"cdp_ws_url"`
	LiveViewURL string `json:"browser_live_view_url"`
	Headless    bool   `json:"headless"`
}

// KernelClient 是 Kernel.sh REST API 的 HTTP 客户端。
type KernelClient struct {
	apiKey     string
	httpClient *http.Client
}

// NewKernelClient 创建一个新的 Kernel.sh 客户端实例。
func NewKernelClient(apiKey string) *KernelClient {
	return &KernelClient{
		apiKey:     apiKey,
		httpClient: &http.Client{},
	}
}

// createSessionRequest 是发送到 POST /browsers 的请求体。
type createSessionRequest struct {
	Stealth        bool `json:"stealth"`
	Headless       bool `json:"headless"`
	TimeoutSeconds int  `json:"timeout_seconds"`
}

// CreateSession 调用 Kernel.sh API 创建一个新的浏览器会话。
func (kc *KernelClient) CreateSession(ctx context.Context, opts CreateSessionOptions) (*KernelSession, error) {
	// Stealth 默认为 true（非显式传 false 时都启用隐身模式）
	stealth := opts.Stealth
	headless := opts.Headless

	timeoutSeconds := 120
	if opts.TimeoutSeconds > 0 {
		timeoutSeconds = opts.TimeoutSeconds
	}

	reqBody := createSessionRequest{
		Stealth:        stealth,
		Headless:       headless,
		TimeoutSeconds: timeoutSeconds,
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("kernel: failed to marshal request body: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, kernelBaseURL+"/browsers", bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("kernel: failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+kc.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := kc.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("kernel: failed to send create session request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("kernel: failed to read response body: %w", err)
	}

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return nil, fmt.Errorf("kernel: create session failed with status %d: %s", resp.StatusCode, string(respBody))
	}

	var session KernelSession
	if err := json.Unmarshal(respBody, &session); err != nil {
		return nil, fmt.Errorf("kernel: failed to parse session response: %w", err)
	}

	slog.Info("kernel: browser session created",
		"session_id", session.SessionID,
		"headless", session.Headless,
		"live_view_url", session.LiveViewURL,
	)

	return &session, nil
}

// DeleteSession 调用 Kernel.sh API 删除指定的浏览器会话。如果会话已过期（404），则不会返回错误。
func (kc *KernelClient) DeleteSession(ctx context.Context, sessionID string) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, kernelBaseURL+"/browsers/"+sessionID, nil)
	if err != nil {
		return fmt.Errorf("kernel: failed to create delete request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+kc.apiKey)

	resp, err := kc.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("kernel: failed to send delete session request: %w", err)
	}
	defer resp.Body.Close()

	// 容忍 404 错误，表示会话已过期
	if resp.StatusCode == http.StatusNotFound {
		slog.Warn("kernel: session already expired or not found", "session_id", sessionID)
		return nil
	}

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNoContent {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("kernel: delete session failed with status %d: %s", resp.StatusCode, string(respBody))
	}

	slog.Info("kernel: browser session deleted", "session_id", sessionID)

	return nil
}
