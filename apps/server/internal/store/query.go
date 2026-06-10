package store

import (
	"context"
	"database/sql"
	"fmt"
)

// Querier 是只读查询所需的最小 DB 接口。
type Querier interface {
	QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error)
}

// GuideQueries 提供 mafengwo_guides 的只读查询（cron stale 刷新消费，设计 D12）。
type GuideQueries struct {
	db Querier
}

// NewGuideQueries 创建查询器。db 不可为 nil（调用方负责在 DB 未配置时不构造）。
func NewGuideQueries(db Querier) *GuideQueries {
	return &GuideQueries{db: db}
}

// StaleGuideURLs 返回 crawled_at 最旧的 limit 条游记 source_url，
// 供 cron 重抓详情刷新（设计 D12）。
func (q *GuideQueries) StaleGuideURLs(ctx context.Context, limit int) ([]string, error) {
	if limit <= 0 {
		return nil, fmt.Errorf("store: invalid stale guide limit %d", limit)
	}

	rows, err := q.db.QueryContext(ctx,
		`SELECT source_url FROM mafengwo_guides ORDER BY crawled_at ASC LIMIT ?`, limit)
	if err != nil {
		return nil, fmt.Errorf("store: query stale guides: %w", err)
	}
	defer rows.Close()

	var urls []string
	for rows.Next() {
		var u string
		if err := rows.Scan(&u); err != nil {
			return nil, fmt.Errorf("store: scan stale guide url: %w", err)
		}
		urls = append(urls, u)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("store: iterate stale guides: %w", err)
	}
	return urls, nil
}
