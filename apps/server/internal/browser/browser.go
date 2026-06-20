package browser

import (
	"context"
	"log/slog"
	"strings"
	"time"

	"github.com/chromedp/chromedp"
)

// Session 封装了一个远程浏览器会话，通过 CDP WebSocket 连接到远程 Chrome 实例。
type Session struct {
	allocCtx    context.Context
	allocCancel context.CancelFunc
	ctx         context.Context
	cancel      context.CancelFunc
}

// NewSession 创建一个新的远程浏览器会话。
// 通过 CDP WebSocket URL 连接到由 Kernel.sh 提供的远程 Chrome 实例。
func NewSession(parentCtx context.Context, cdpWsURL string) (*Session, error) {
	allocCtx, allocCancel := chromedp.NewRemoteAllocator(parentCtx, cdpWsURL)

	ctx, cancel := chromedp.NewContext(allocCtx)

	slog.Info("connected to remote browser", "cdp_ws_url", cdpWsURL)

	return &Session{
		allocCtx:    allocCtx,
		allocCancel: allocCancel,
		ctx:         ctx,
		cancel:      cancel,
	}, nil
}

// Navigate 导航到指定 URL 并等待页面加载。
// waitMs 为等待时间（毫秒），若 <= 0 则默认为 3000 毫秒。
func (s *Session) Navigate(url string, waitMs int) error {
	if waitMs <= 0 {
		waitMs = 3000
	}

	return chromedp.Run(s.ctx,
		chromedp.Navigate(url),
		chromedp.Sleep(time.Duration(waitMs)*time.Millisecond),
	)
}

// ScrollToLoadMore 通过滚动页面到底部来触发懒加载内容。
// count 为滚动次数，delayMs 为每次滚动后的等待时间（毫秒），若 <= 0 则默认为 2000 毫秒。
func (s *Session) ScrollToLoadMore(count int, delayMs int) error {
	if delayMs <= 0 {
		delayMs = 2000
	}

	for i := 0; i < count; i++ {
		if err := chromedp.Run(s.ctx,
			chromedp.Evaluate(`window.scrollTo(0, document.body.scrollHeight)`, nil),
			chromedp.Sleep(time.Duration(delayMs)*time.Millisecond),
		); err != nil {
			return err
		}
	}

	return nil
}

// Evaluate 在浏览器上下文中执行 JavaScript 脚本，并将结果写入 result。
func (s *Session) Evaluate(jsScript string, result interface{}) error {
	return chromedp.Run(s.ctx,
		chromedp.Evaluate(jsScript, result),
	)
}

// ConvertToMobileURL 将桌面版 URL 转换为移动版 URL。
// 将 "www.mafengwo.cn" 替换为 "m.mafengwo.cn"，若无匹配则原样返回。
// 包级纯函数，便于在创建会话之前完成 URL 转换。
func ConvertToMobileURL(url string) string {
	return strings.Replace(url, "www.mafengwo.cn", "m.mafengwo.cn", 1)
}

// Close 关闭浏览器会话并释放所有相关资源。
func (s *Session) Close() {
	s.cancel()
	s.allocCancel()
	slog.Info("browser session closed")
}
