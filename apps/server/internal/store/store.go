// Package store 提供 mafengwo_* 暂存表（Bronze 层）的类型化同步保存。
//
// 设计决策 D2/D3（docs/superpowers/specs/2026-06-10-data-pipeline-overhaul-design.md）：
//   - Go 只写 mafengwo_* 暂存表，travel_guides 的唯一写入方是 TS API；
//   - 废除「发布方手写 map → JSON → 订阅方手写 struct」的事件保存路径，
//     爬取 handler 直接以共享类型化 struct 同步调用本包的保存函数；
//   - 保存失败必须向调用方返回 error，由 handler 透出到 HTTP 响应，
//     绝不只记日志后丢弃。
package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"
)

// Execer 是保存函数所需的最小 DB 接口，便于测试注入断言 SQL。
type Execer interface {
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
}

// Store 持有数据库连接并暴露类型化保存函数。
type Store struct {
	db  Execer
	now func() time.Time
}

// New 创建 Store。db 不可为 nil（调用方负责在 DB 未配置时不构造 Store）。
func New(db Execer) *Store {
	return &Store{db: db, now: time.Now}
}

// ---------------------------------------------------------------------------
// GuideDetail → mafengwo_guides
// ---------------------------------------------------------------------------

// GuideDetail 是游记/攻略详情的类型化保存载荷。
type GuideDetail struct {
	GuideID         string
	SourceURL       string
	Title           string
	DestinationID   string
	DestinationName string
	AuthorName      string
	Content         string
	ContentHTML     string
	CoverImageURL   string
	ImageURLs       []string
	ViewsCount      int
	LikesCount      int
	// PublishedAt 为页面提取的发布时间；解析失败为 nil，存 NULL 而非零值。
	PublishedAt *time.Time
}

// SaveGuideDetail 将游记/攻略详情 upsert 到 mafengwo_guides。
func (s *Store) SaveGuideDetail(ctx context.Context, g GuideDetail) error {
	if g.GuideID == "" {
		return errors.New("store: guideId is required (cannot derive from source URL)")
	}
	if g.SourceURL == "" {
		return errors.New("store: sourceUrl is required")
	}

	imagesJSON, err := json.Marshal(emptyIfNil(g.ImageURLs))
	if err != nil {
		return fmt.Errorf("store: marshal imageUrls: %w", err)
	}

	now := s.now()
	_, err = s.db.ExecContext(ctx, `
		INSERT INTO mafengwo_guides (guide_id, source_url, title, destination_id, destination_name,
			author_name, content, content_html, sections, cover_image_url, image_urls,
			views_count, likes_count, tags, published_at, crawled_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON DUPLICATE KEY UPDATE
			title=VALUES(title), content=VALUES(content), content_html=VALUES(content_html),
			cover_image_url=VALUES(cover_image_url), image_urls=VALUES(image_urls),
			views_count=VALUES(views_count), likes_count=VALUES(likes_count),
			published_at=COALESCE(VALUES(published_at), published_at),
			crawled_at=VALUES(crawled_at), updated_at=?`,
		g.GuideID, g.SourceURL, g.Title, nullIfEmpty(g.DestinationID), nullIfEmpty(g.DestinationName),
		nullIfEmpty(g.AuthorName), g.Content, nullIfEmpty(g.ContentHTML), "[]", nullIfEmpty(g.CoverImageURL), string(imagesJSON),
		g.ViewsCount, g.LikesCount, "[]", nullableTime(g.PublishedAt), now, now,
	)
	if err != nil {
		return fmt.Errorf("store: save mafengwo_guides %s: %w", g.GuideID, err)
	}
	return nil
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

// nullIfEmpty 将空字符串映射为 SQL NULL，避免空串污染可空列。
func nullIfEmpty(s string) any {
	if s == "" {
		return nil
	}
	return s
}

// nullableTime 将 nil 时间映射为 SQL NULL。
func nullableTime(t *time.Time) any {
	if t == nil {
		return nil
	}
	return *t
}

// emptyIfNil 保证 JSON 序列化产出 [] 而非 null（列为 NOT NULL JSON）。
func emptyIfNil(s []string) []string {
	if s == nil {
		return []string{}
	}
	return s
}
