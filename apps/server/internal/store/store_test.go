package store

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"testing"
	"time"
)

// =============================================================================
// 测试基础设施：通过 Execer 接口注入伪 DB，捕获 SQL 与参数用于断言
// =============================================================================

type fakeResult struct{}

func (fakeResult) LastInsertId() (int64, error) { return 1, nil }
func (fakeResult) RowsAffected() (int64, error) { return 1, nil }

type fakeExecer struct {
	queries []string
	args    [][]any
	err     error
}

func (f *fakeExecer) ExecContext(_ context.Context, query string, args ...any) (sql.Result, error) {
	f.queries = append(f.queries, query)
	f.args = append(f.args, args)
	if f.err != nil {
		return nil, f.err
	}
	return fakeResult{}, nil
}

var fixedNow = time.Date(2026, 6, 10, 12, 0, 0, 0, time.UTC)

func newTestStore(db *fakeExecer) *Store {
	s := New(db)
	s.now = func() time.Time { return fixedNow }
	return s
}

// containsArg 检查参数列表中是否包含指定值。
func containsArg(args []any, want any) bool {
	for _, a := range args {
		if a == want {
			return true
		}
	}
	return false
}

// =============================================================================
// SaveGuideDetail
// =============================================================================

func TestSaveGuideDetail_FullRoundTrip(t *testing.T) {
	// Arrange
	db := &fakeExecer{}
	s := newTestStore(db)
	publishedAt := time.Date(2023, 5, 20, 0, 0, 0, 0, time.UTC)
	guide := GuideDetail{
		GuideID:         "24648165",
		SourceURL:       "https://www.mafengwo.cn/i/24648165.html",
		Title:           "北京七日游",
		DestinationID:   "10065",
		DestinationName: "北京",
		AuthorName:      "旅行者",
		Content:         "第一天去了故宫。",
		ContentHTML:     "<p>第一天去了故宫。</p>",
		CoverImageURL:   "https://img.example.com/cover.jpg",
		ImageURLs:       []string{"https://img.example.com/1.jpg"},
		ViewsCount:      12000,
		LikesCount:      340,
		PublishedAt:     &publishedAt,
	}

	// Act
	err := s.SaveGuideDetail(context.Background(), guide)

	// Assert
	if err != nil {
		t.Fatalf("SaveGuideDetail 应成功, got: %v", err)
	}
	if len(db.queries) != 1 {
		t.Fatalf("应执行 1 条 SQL, got %d", len(db.queries))
	}
	query := db.queries[0]
	if !strings.Contains(query, "INSERT INTO mafengwo_guides") {
		t.Errorf("应写入 mafengwo_guides, got: %s", query)
	}
	if !strings.Contains(query, "published_at") {
		t.Errorf("INSERT 应包含 published_at 列, got: %s", query)
	}
	args := db.args[0]
	for _, want := range []any{"24648165", "https://www.mafengwo.cn/i/24648165.html", "北京七日游", "10065", "北京", "旅行者", 12000, 340} {
		if !containsArg(args, want) {
			t.Errorf("SQL 参数缺失 %v, args: %v", want, args)
		}
	}
	if !containsArg(args, `["https://img.example.com/1.jpg"]`) {
		t.Errorf("imageUrls 应序列化为 JSON 数组, args: %v", args)
	}
	if !containsArg(args, publishedAt) {
		t.Errorf("publishedAt 应作为时间参数传递, args: %v", args)
	}
}

func TestSaveGuideDetail_MissingGuideID(t *testing.T) {
	// Arrange: guideId 为空（URL 无法提取 ID）
	db := &fakeExecer{}
	s := newTestStore(db)

	// Act
	err := s.SaveGuideDetail(context.Background(), GuideDetail{SourceURL: "https://example.com/x.html"})

	// Assert: 必须拒绝而不是写入空 ID 脏行
	if err == nil {
		t.Fatal("guideId 为空时应返回错误")
	}
	if len(db.queries) != 0 {
		t.Errorf("guideId 为空时不应执行 SQL, got %d", len(db.queries))
	}
}

func TestSaveGuideDetail_MissingSourceURL(t *testing.T) {
	// Arrange
	db := &fakeExecer{}
	s := newTestStore(db)

	// Act
	err := s.SaveGuideDetail(context.Background(), GuideDetail{GuideID: "123"})

	// Assert
	if err == nil {
		t.Fatal("sourceUrl 为空时应返回错误")
	}
	if len(db.queries) != 0 {
		t.Errorf("sourceUrl 为空时不应执行 SQL, got %d", len(db.queries))
	}
}

func TestSaveGuideDetail_NilPublishedAtStoresNull(t *testing.T) {
	// Arrange: 页面无发布时间 → 存 NULL 而非零值
	db := &fakeExecer{}
	s := newTestStore(db)

	// Act
	err := s.SaveGuideDetail(context.Background(), GuideDetail{
		GuideID:   "123",
		SourceURL: "https://www.mafengwo.cn/i/123.html",
		Title:     "无发布时间",
	})

	// Assert
	if err != nil {
		t.Fatalf("SaveGuideDetail 应成功, got: %v", err)
	}
	if !containsArg(db.args[0], nil) {
		t.Errorf("publishedAt 为 nil 时应传 SQL NULL, args: %v", db.args[0])
	}
}

func TestSaveGuideDetail_NilImagesMarshalsEmptyArray(t *testing.T) {
	// Arrange: image_urls 列为 NOT NULL JSON，nil 切片必须序列化为 []
	db := &fakeExecer{}
	s := newTestStore(db)

	// Act
	err := s.SaveGuideDetail(context.Background(), GuideDetail{
		GuideID:   "123",
		SourceURL: "https://www.mafengwo.cn/i/123.html",
	})

	// Assert
	if err != nil {
		t.Fatalf("SaveGuideDetail 应成功, got: %v", err)
	}
	if !containsArg(db.args[0], "[]") {
		t.Errorf("nil 图片列表应序列化为 [], args: %v", db.args[0])
	}
}

func TestSaveGuideDetail_DBErrorPropagates(t *testing.T) {
	// Arrange: DB 报错必须向调用方透出，不允许吞错
	db := &fakeExecer{err: errors.New("connection lost")}
	s := newTestStore(db)

	// Act
	err := s.SaveGuideDetail(context.Background(), GuideDetail{
		GuideID:   "123",
		SourceURL: "https://www.mafengwo.cn/i/123.html",
	})

	// Assert
	if err == nil || !strings.Contains(err.Error(), "connection lost") {
		t.Errorf("DB 错误应透传, got: %v", err)
	}
}

// =============================================================================
// D2 回归守卫：store 包绝不写 travel_guides（唯一写入方为 TS API）
// =============================================================================

func TestStore_NeverWritesTravelGuides(t *testing.T) {
	// Arrange
	db := &fakeExecer{}
	s := newTestStore(db)
	ctx := context.Background()

	// Act
	_ = s.SaveGuideDetail(ctx, GuideDetail{GuideID: "1", SourceURL: "https://x/1.html"})

	// Assert
	if len(db.queries) == 0 {
		t.Fatal("应至少执行一条 SQL")
	}
	for _, q := range db.queries {
		if strings.Contains(q, "travel_guides") {
			t.Errorf("store 不得写 travel_guides（设计 D2）, got: %s", q)
		}
	}
}
