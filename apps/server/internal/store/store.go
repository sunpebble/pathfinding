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

// SaveResult 汇总批量保存的结果，handler 必须将其透出到 HTTP 响应。
type SaveResult struct {
	SavedCount int
	Errors     []string
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
	// QualityScore 为 0-100 整数（mafengwo_guides.quality_score 列为 int）。
	QualityScore int
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
			views_count, likes_count, tags, published_at, quality_score, crawled_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON DUPLICATE KEY UPDATE
			title=VALUES(title), content=VALUES(content), content_html=VALUES(content_html),
			cover_image_url=VALUES(cover_image_url), image_urls=VALUES(image_urls),
			views_count=VALUES(views_count), likes_count=VALUES(likes_count),
			published_at=COALESCE(VALUES(published_at), published_at),
			quality_score=VALUES(quality_score), crawled_at=VALUES(crawled_at), updated_at=?`,
		g.GuideID, g.SourceURL, g.Title, nullIfEmpty(g.DestinationID), nullIfEmpty(g.DestinationName),
		nullIfEmpty(g.AuthorName), g.Content, nullIfEmpty(g.ContentHTML), "[]", nullIfEmpty(g.CoverImageURL), string(imagesJSON),
		g.ViewsCount, g.LikesCount, "[]", nullableTime(g.PublishedAt), g.QualityScore, now, now,
	)
	if err != nil {
		return fmt.Errorf("store: save mafengwo_guides %s: %w", g.GuideID, err)
	}
	return nil
}

// ---------------------------------------------------------------------------
// POI → mafengwo_pois
// ---------------------------------------------------------------------------

// POI 是 POI 列表条目的类型化保存载荷。
type POI struct {
	PoiID           string
	SourceURL       string
	Name            string
	Category        string
	DestinationID   string
	DestinationName string
	// Rating 由原始字符串显式解析；解析失败 Valid=false 存 NULL，绝不写 0。
	Rating        sql.NullFloat64
	CoverImageURL string
}

// SavePOIs 将 POI 批量 upsert 到 mafengwo_pois。
// 单条失败不阻断其余条目，失败原因逐条记录在 SaveResult.Errors。
func (s *Store) SavePOIs(ctx context.Context, pois []POI) SaveResult {
	var result SaveResult
	now := s.now()

	for _, p := range pois {
		if err := s.savePOI(ctx, p, now); err != nil {
			result.Errors = append(result.Errors, err.Error())
			continue
		}
		result.SavedCount++
	}
	return result
}

func (s *Store) savePOI(ctx context.Context, p POI, now time.Time) error {
	if p.PoiID == "" {
		return fmt.Errorf("store: POI %q: poiId is required", p.Name)
	}
	if p.SourceURL == "" {
		return fmt.Errorf("store: POI %q: sourceUrl is required", p.Name)
	}
	if p.Name == "" {
		return fmt.Errorf("store: POI %s: name is required", p.PoiID)
	}

	_, err := s.db.ExecContext(ctx, `
		INSERT INTO mafengwo_pois (poi_id, source_url, name, category, destination_id, destination_name,
			rating, tips, highlights, cover_image_url, image_urls, tags, signature_dishes, amenities, crawled_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON DUPLICATE KEY UPDATE
			name=VALUES(name), category=VALUES(category),
			rating=COALESCE(VALUES(rating), rating),
			cover_image_url=COALESCE(VALUES(cover_image_url), cover_image_url),
			crawled_at=VALUES(crawled_at), updated_at=?`,
		p.PoiID, p.SourceURL, p.Name, p.Category, nullIfEmpty(p.DestinationID), nullIfEmpty(p.DestinationName),
		p.Rating, "[]", "[]", nullIfEmpty(p.CoverImageURL), "[]", "[]", "[]", "[]", now, now,
	)
	if err != nil {
		return fmt.Errorf("store: save mafengwo_pois %s: %w", p.PoiID, err)
	}
	return nil
}

// ---------------------------------------------------------------------------
// Destination → mafengwo_destinations
// ---------------------------------------------------------------------------

// Destination 是目的地页面的类型化保存载荷。
type Destination struct {
	MddID            string
	SourceURL        string
	Name             string
	NameEn           string
	Description      string
	CoverImageURL    string
	ImageURLs        []string
	BestTravelTime   string
	TravelNotesCount int
	PoisCount        int
}

// SaveDestination 将目的地 upsert 到 mafengwo_destinations。
func (s *Store) SaveDestination(ctx context.Context, d Destination) error {
	if d.MddID == "" {
		return errors.New("store: mddId is required")
	}
	if d.SourceURL == "" {
		return errors.New("store: sourceUrl is required")
	}
	if d.Name == "" {
		return fmt.Errorf("store: destination %s: name is required", d.MddID)
	}

	imagesJSON, err := json.Marshal(emptyIfNil(d.ImageURLs))
	if err != nil {
		return fmt.Errorf("store: marshal imageUrls: %w", err)
	}

	now := s.now()
	_, err = s.db.ExecContext(ctx, `
		INSERT INTO mafengwo_destinations (mdd_id, source_url, name, name_en, description,
			cover_image_url, image_urls, best_travel_time, travel_notes_count, pois_count, crawled_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON DUPLICATE KEY UPDATE
			name=VALUES(name), description=VALUES(description),
			cover_image_url=VALUES(cover_image_url), image_urls=VALUES(image_urls),
			best_travel_time=VALUES(best_travel_time),
			travel_notes_count=VALUES(travel_notes_count), pois_count=VALUES(pois_count),
			crawled_at=VALUES(crawled_at), updated_at=?`,
		d.MddID, d.SourceURL, d.Name, nullIfEmpty(d.NameEn), nullIfEmpty(d.Description),
		nullIfEmpty(d.CoverImageURL), string(imagesJSON), nullIfEmpty(d.BestTravelTime),
		d.TravelNotesCount, d.PoisCount, now, now,
	)
	if err != nil {
		return fmt.Errorf("store: save mafengwo_destinations %s: %w", d.MddID, err)
	}
	return nil
}

// ---------------------------------------------------------------------------
// QA → mafengwo_qa
// ---------------------------------------------------------------------------

// QA 是问答列表条目的类型化保存载荷。
// 列表页只有标题与回答数，content 列（NOT NULL）以空字符串占位，
// 待问答详情爬取实现后补全。
type QA struct {
	QuestionID      string
	SourceURL       string
	Title           string
	DestinationID   string
	DestinationName string
	AnswersCount    int
}

// SaveQA 将问答条目批量 upsert 到 mafengwo_qa。
func (s *Store) SaveQA(ctx context.Context, qas []QA) SaveResult {
	var result SaveResult
	now := s.now()

	for _, q := range qas {
		if err := s.saveQA(ctx, q, now); err != nil {
			result.Errors = append(result.Errors, err.Error())
			continue
		}
		result.SavedCount++
	}
	return result
}

func (s *Store) saveQA(ctx context.Context, q QA, now time.Time) error {
	if q.QuestionID == "" {
		return fmt.Errorf("store: QA %q: questionId is required", q.Title)
	}
	if q.SourceURL == "" {
		return fmt.Errorf("store: QA %q: sourceUrl is required", q.Title)
	}
	if q.Title == "" {
		return fmt.Errorf("store: QA %s: title is required", q.QuestionID)
	}

	_, err := s.db.ExecContext(ctx, `
		INSERT INTO mafengwo_qa (question_id, source_url, title, content,
			destination_id, destination_name, answers_count, tags, crawled_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON DUPLICATE KEY UPDATE
			title=VALUES(title), answers_count=VALUES(answers_count), crawled_at=VALUES(crawled_at)`,
		q.QuestionID, q.SourceURL, q.Title, "",
		nullIfEmpty(q.DestinationID), nullIfEmpty(q.DestinationName), q.AnswersCount, "[]", now,
	)
	if err != nil {
		return fmt.Errorf("store: save mafengwo_qa %s: %w", q.QuestionID, err)
	}
	return nil
}

// ---------------------------------------------------------------------------
// Ranking → mafengwo_rankings
// ---------------------------------------------------------------------------

// Ranking 是排行榜页面的类型化保存载荷。
// RankingID 为业务键 "{destinationId}_{rankingType}"，与 D1 的唯一索引对应。
type Ranking struct {
	RankingID       string
	SourceURL       string
	RankingType     string
	Title           string
	DestinationID   string
	DestinationName string
	// Items 为提取条目数组的 JSON（原样留底，Bronze 层不做二次解释）。
	Items json.RawMessage
}

// SaveRankings 将排行榜 upsert 到 mafengwo_rankings。
func (s *Store) SaveRankings(ctx context.Context, r Ranking) error {
	if r.RankingID == "" {
		return errors.New("store: rankingId is required")
	}
	if r.SourceURL == "" {
		return errors.New("store: sourceUrl is required")
	}
	if r.RankingType == "" {
		return fmt.Errorf("store: ranking %s: rankingType is required", r.RankingID)
	}
	if len(r.Items) == 0 {
		return fmt.Errorf("store: ranking %s: items is required", r.RankingID)
	}

	now := s.now()
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO mafengwo_rankings (ranking_id, source_url, ranking_type, title,
			destination_id, destination_name, items, crawled_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		ON DUPLICATE KEY UPDATE
			title=VALUES(title), items=VALUES(items), crawled_at=VALUES(crawled_at), updated_at=?`,
		r.RankingID, r.SourceURL, r.RankingType, r.Title,
		nullIfEmpty(r.DestinationID), nullIfEmpty(r.DestinationName), string(r.Items), now, now,
	)
	if err != nil {
		return fmt.Errorf("store: save mafengwo_rankings %s: %w", r.RankingID, err)
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
