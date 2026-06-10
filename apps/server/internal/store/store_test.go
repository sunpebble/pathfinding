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
		QualityScore:    78,
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
	for _, want := range []any{"24648165", "https://www.mafengwo.cn/i/24648165.html", "北京七日游", "10065", "北京", "旅行者", 12000, 340, 78} {
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
// SavePOIs
// =============================================================================

func TestSavePOIs_TypedRoundTrip(t *testing.T) {
	// Arrange: 一条带评分、一条评分解析失败（NULL）
	db := &fakeExecer{}
	s := newTestStore(db)
	pois := []POI{
		{
			PoiID:           "339",
			SourceURL:       "https://www.mafengwo.cn/poi/339.html",
			Name:            "故宫",
			Category:        "attraction",
			DestinationID:   "10065",
			DestinationName: "北京",
			Rating:          sql.NullFloat64{Float64: 4.8, Valid: true},
			CoverImageURL:   "https://img.example.com/gugong.jpg",
		},
		{
			PoiID:     "340",
			SourceURL: "https://www.mafengwo.cn/poi/340.html",
			Name:      "天坛",
			Category:  "attraction",
			Rating:    sql.NullFloat64{}, // 解析失败 → NULL
		},
	}

	// Act
	result := s.SavePOIs(context.Background(), pois)

	// Assert
	if result.SavedCount != 2 {
		t.Fatalf("应保存 2 条, got %d (errors: %v)", result.SavedCount, result.Errors)
	}
	if len(result.Errors) != 0 {
		t.Fatalf("不应有错误, got: %v", result.Errors)
	}
	if !strings.Contains(db.queries[0], "INSERT INTO mafengwo_pois") {
		t.Errorf("应写入 mafengwo_pois, got: %s", db.queries[0])
	}
	if !containsArg(db.args[0], "339") || !containsArg(db.args[0], "https://www.mafengwo.cn/poi/339.html") {
		t.Errorf("poiId/sourceUrl 必须经参数传递, args: %v", db.args[0])
	}
	if !containsArg(db.args[0], sql.NullFloat64{Float64: 4.8, Valid: true}) {
		t.Errorf("有效评分应以 NullFloat64 传递, args: %v", db.args[0])
	}
	if !containsArg(db.args[1], sql.NullFloat64{}) {
		t.Errorf("解析失败的评分应传 NULL（Valid=false）而非 0, args: %v", db.args[1])
	}
}

func TestSavePOIs_MissingPoiIDRecordedAsError(t *testing.T) {
	// Arrange: 缺 poiId 的条目必须计入错误，不得以空 ID 入库
	db := &fakeExecer{}
	s := newTestStore(db)
	pois := []POI{
		{PoiID: "", SourceURL: "https://example.com", Name: "无ID景点"},
		{PoiID: "339", SourceURL: "https://www.mafengwo.cn/poi/339.html", Name: "故宫", Category: "attraction"},
	}

	// Act
	result := s.SavePOIs(context.Background(), pois)

	// Assert
	if result.SavedCount != 1 {
		t.Errorf("应只保存 1 条, got %d", result.SavedCount)
	}
	if len(result.Errors) != 1 || !strings.Contains(result.Errors[0], "poiId is required") {
		t.Errorf("缺 poiId 应记录错误, got: %v", result.Errors)
	}
	if len(db.queries) != 1 {
		t.Errorf("缺 poiId 的条目不应执行 SQL, 执行了 %d 条", len(db.queries))
	}
}

func TestSavePOIs_DBErrorPerItem(t *testing.T) {
	// Arrange
	db := &fakeExecer{err: errors.New("duplicate entry")}
	s := newTestStore(db)
	pois := []POI{{PoiID: "339", SourceURL: "https://www.mafengwo.cn/poi/339.html", Name: "故宫"}}

	// Act
	result := s.SavePOIs(context.Background(), pois)

	// Assert
	if result.SavedCount != 0 {
		t.Errorf("DB 报错时 savedCount 应为 0, got %d", result.SavedCount)
	}
	if len(result.Errors) != 1 || !strings.Contains(result.Errors[0], "duplicate entry") {
		t.Errorf("DB 错误应逐条记录, got: %v", result.Errors)
	}
}

func TestSavePOIs_EmptyInput(t *testing.T) {
	// Arrange
	db := &fakeExecer{}
	s := newTestStore(db)

	// Act
	result := s.SavePOIs(context.Background(), nil)

	// Assert
	if result.SavedCount != 0 || len(result.Errors) != 0 {
		t.Errorf("空输入应返回零结果, got: %+v", result)
	}
}

// =============================================================================
// SaveDestination
// =============================================================================

func TestSaveDestination_RoundTrip(t *testing.T) {
	// Arrange
	db := &fakeExecer{}
	s := newTestStore(db)
	dest := Destination{
		MddID:            "10065",
		SourceURL:        "https://www.mafengwo.cn/travel-scenic-spot/mafengwo/10065.html",
		Name:             "北京",
		NameEn:           "Beijing",
		Description:      "中国首都",
		ImageURLs:        []string{"https://img.example.com/bj.jpg"},
		BestTravelTime:   "9-10月",
		TravelNotesCount: 120000,
		PoisCount:        3456,
	}

	// Act
	err := s.SaveDestination(context.Background(), dest)

	// Assert
	if err != nil {
		t.Fatalf("SaveDestination 应成功, got: %v", err)
	}
	if !strings.Contains(db.queries[0], "INSERT INTO mafengwo_destinations") {
		t.Errorf("应写入 mafengwo_destinations, got: %s", db.queries[0])
	}
	for _, want := range []any{"10065", "北京", "Beijing", 120000, 3456} {
		if !containsArg(db.args[0], want) {
			t.Errorf("SQL 参数缺失 %v, args: %v", want, db.args[0])
		}
	}
}

func TestSaveDestination_MissingMddID(t *testing.T) {
	// Arrange
	db := &fakeExecer{}
	s := newTestStore(db)

	// Act
	err := s.SaveDestination(context.Background(), Destination{SourceURL: "https://example.com", Name: "北京"})

	// Assert
	if err == nil {
		t.Fatal("mddId 为空时应返回错误")
	}
	if len(db.queries) != 0 {
		t.Errorf("mddId 为空时不应执行 SQL")
	}
}

// =============================================================================
// SaveQA
// =============================================================================

func TestSaveQA_RoundTrip(t *testing.T) {
	// Arrange
	db := &fakeExecer{}
	s := newTestStore(db)
	qas := []QA{
		{
			QuestionID:      "23363201",
			SourceURL:       "https://www.mafengwo.cn/wenda/detail-23363201.html",
			Title:           "北京三日游怎么安排？",
			DestinationID:   "10065",
			DestinationName: "北京",
			AnswersCount:    12,
		},
	}

	// Act
	result := s.SaveQA(context.Background(), qas)

	// Assert
	if result.SavedCount != 1 || len(result.Errors) != 0 {
		t.Fatalf("应保存 1 条, got: %+v", result)
	}
	if !strings.Contains(db.queries[0], "INSERT INTO mafengwo_qa") {
		t.Errorf("应写入 mafengwo_qa, got: %s", db.queries[0])
	}
	for _, want := range []any{"23363201", "北京三日游怎么安排？", 12} {
		if !containsArg(db.args[0], want) {
			t.Errorf("SQL 参数缺失 %v, args: %v", want, db.args[0])
		}
	}
}

func TestSaveQA_MissingQuestionID(t *testing.T) {
	// Arrange
	db := &fakeExecer{}
	s := newTestStore(db)

	// Act
	result := s.SaveQA(context.Background(), []QA{{SourceURL: "https://example.com", Title: "无ID问题"}})

	// Assert
	if result.SavedCount != 0 {
		t.Errorf("缺 questionId 不应入库, got savedCount=%d", result.SavedCount)
	}
	if len(result.Errors) != 1 || !strings.Contains(result.Errors[0], "questionId is required") {
		t.Errorf("缺 questionId 应记录错误, got: %v", result.Errors)
	}
}

// =============================================================================
// SaveRankings
// =============================================================================

func TestSaveRankings_RoundTrip(t *testing.T) {
	// Arrange
	db := &fakeExecer{}
	s := newTestStore(db)
	ranking := Ranking{
		RankingID:       "10065_must_visit",
		SourceURL:       "https://www.mafengwo.cn/jd/10065/gonglve.html",
		RankingType:     "must_visit",
		Title:           "北京 must_visit",
		DestinationID:   "10065",
		DestinationName: "北京",
		Items:           []byte(`[{"rank":1,"name":"故宫"}]`),
	}

	// Act
	err := s.SaveRankings(context.Background(), ranking)

	// Assert
	if err != nil {
		t.Fatalf("SaveRankings 应成功, got: %v", err)
	}
	if !strings.Contains(db.queries[0], "INSERT INTO mafengwo_rankings") {
		t.Errorf("应写入 mafengwo_rankings, got: %s", db.queries[0])
	}
	for _, want := range []any{"10065_must_visit", "must_visit", `[{"rank":1,"name":"故宫"}]`} {
		if !containsArg(db.args[0], want) {
			t.Errorf("SQL 参数缺失 %v, args: %v", want, db.args[0])
		}
	}
}

func TestSaveRankings_MissingItems(t *testing.T) {
	// Arrange: items 列为 NOT NULL JSON，空 items 必须拒绝
	db := &fakeExecer{}
	s := newTestStore(db)

	// Act
	err := s.SaveRankings(context.Background(), Ranking{
		RankingID:   "10065_food",
		SourceURL:   "https://example.com",
		RankingType: "food",
		Title:       "美食榜",
	})

	// Assert
	if err == nil {
		t.Fatal("items 为空时应返回错误")
	}
	if len(db.queries) != 0 {
		t.Errorf("items 为空时不应执行 SQL")
	}
}

// =============================================================================
// D2 回归守卫：store 包绝不写 travel_guides（唯一写入方为 TS API）
// =============================================================================

func TestStore_NeverWritesTravelGuides(t *testing.T) {
	// Arrange: 跑全部保存函数，收集所有 SQL
	db := &fakeExecer{}
	s := newTestStore(db)
	ctx := context.Background()

	// Act
	_ = s.SaveGuideDetail(ctx, GuideDetail{GuideID: "1", SourceURL: "https://x/1.html"})
	_ = s.SavePOIs(ctx, []POI{{PoiID: "2", SourceURL: "https://x/poi/2.html", Name: "p"}})
	_ = s.SaveDestination(ctx, Destination{MddID: "3", SourceURL: "https://x/3.html", Name: "d"})
	_ = s.SaveQA(ctx, []QA{{QuestionID: "4", SourceURL: "https://x/detail-4.html", Title: "q"}})
	_ = s.SaveRankings(ctx, Ranking{RankingID: "5", SourceURL: "https://x/5.html", RankingType: "food", Title: "t", Items: []byte("[]")})

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
