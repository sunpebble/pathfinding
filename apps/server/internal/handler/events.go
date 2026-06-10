package handler

import (
	"context"
	"log/slog"

	"github.com/pathfinding/server/internal/eventbus"
)

// RegisterEventHandlers subscribes the remaining non-critical event handlers.
//
// 保存路径已废除事件订阅（设计 D2/D3）：爬取 handler 直接同步调用
// internal/store 的类型化保存函数，保存结果透出到 HTTP 响应；
// Go 不再写 travel_guides（唯一写入方为 TS API）。
// EventBus 仅保留非关键通知用途。
func (h *Handler) RegisterEventHandlers() {
	h.EventBus.Subscribe("notification.send", h.handleNotification)

	slog.Info("Event handlers registered", "count", 1)
}

func (h *Handler) handleNotification(ctx context.Context, event eventbus.Event) error {
	slog.Info("Notification received (stub)", "data", event.Data)
	h.EventBus.Publish(ctx, eventbus.Event{
		Topic: "notification.sent",
		Data:  event.Data,
	})
	return nil
}
