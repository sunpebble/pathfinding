package service

import (
	"strings"
	"testing"
)

// =============================================================================
// CleanContent 测试
// =============================================================================

func TestCleanContent_RemovesScriptTags(t *testing.T) {
	// 验证 script 标签及其内容被移除
	input := `<p>Hello</p><script>alert('xss')</script><p>World</p>`
	got := CleanContent(input, 0)
	if strings.Contains(got, "alert") || strings.Contains(got, "script") {
		t.Errorf("script 标签内容未被移除, got: %q", got)
	}
	if !strings.Contains(got, "Hello") || !strings.Contains(got, "World") {
		t.Errorf("正常文本不应被移除, got: %q", got)
	}
}

func TestCleanContent_RemovesStyleTags(t *testing.T) {
	// 验证 style 标签及其内容被移除
	input := `<p>Hello</p><style>body{color:red}</style><p>World</p>`
	got := CleanContent(input, 0)
	if strings.Contains(got, "color") || strings.Contains(got, "style") {
		t.Errorf("style 标签内容未被移除, got: %q", got)
	}
	if !strings.Contains(got, "Hello") || !strings.Contains(got, "World") {
		t.Errorf("正常文本不应被移除, got: %q", got)
	}
}

func TestCleanContent_StripsHTMLTags(t *testing.T) {
	// 验证所有 HTML 标签被替换为空格
	input := `<h1>Title</h1><p>Content <b>bold</b></p>`
	got := CleanContent(input, 0)
	if strings.Contains(got, "<") || strings.Contains(got, ">") {
		t.Errorf("HTML 标签未被完全移除, got: %q", got)
	}
	if !strings.Contains(got, "Title") || !strings.Contains(got, "Content") || !strings.Contains(got, "bold") {
		t.Errorf("文本内容不应被移除, got: %q", got)
	}
}

func TestCleanContent_CollapsesWhitespace(t *testing.T) {
	// 验证连续空白被折叠为单个空格
	input := `<p>Hello</p>   <p>World</p>`
	got := CleanContent(input, 0)
	if strings.Contains(got, "  ") {
		t.Errorf("连续空白未被折叠, got: %q", got)
	}
}

func TestCleanContent_TruncatesByRuneCount(t *testing.T) {
	// 验证按 rune 数量截断，而非字节数（中文字符场景）
	input := "这是一段中文测试内容用于验证截断功能"
	got := CleanContent(input, 5)
	runes := []rune(got)
	if len(runes) != 5 {
		t.Errorf("期望截断为 5 个 rune, got %d runes: %q", len(runes), got)
	}
	if string(runes) != "这是一段中" {
		t.Errorf("截断结果不正确, got: %q", got)
	}
}

func TestCleanContent_EmptyInput(t *testing.T) {
	// 验证空字符串输入返回空字符串
	got := CleanContent("", 100)
	if got != "" {
		t.Errorf("空输入应返回空字符串, got: %q", got)
	}
}

func TestCleanContent_NestedTags(t *testing.T) {
	// 验证嵌套标签被正确移除
	input := `<div><p><span>深层嵌套</span></p></div>`
	got := CleanContent(input, 0)
	if strings.Contains(got, "<") {
		t.Errorf("嵌套标签未被完全移除, got: %q", got)
	}
	if !strings.Contains(got, "深层嵌套") {
		t.Errorf("嵌套标签中的文本不应被移除, got: %q", got)
	}
}

func TestCleanContent_DefaultMaxLenWhenZero(t *testing.T) {
	// 验证 maxLen 为 0 时使用默认值 10000
	input := strings.Repeat("a", 15000)
	got := CleanContent(input, 0)
	runes := []rune(got)
	if len(runes) != 10000 {
		t.Errorf("maxLen=0 时应使用默认值 10000, got %d runes", len(runes))
	}
}

func TestCleanContent_NegativeMaxLen(t *testing.T) {
	// 验证 maxLen 为负数时使用默认值 10000
	input := strings.Repeat("b", 15000)
	got := CleanContent(input, -1)
	runes := []rune(got)
	if len(runes) != 10000 {
		t.Errorf("maxLen=-1 时应使用默认值 10000, got %d runes", len(runes))
	}
}

func TestCleanContent_CaseInsensitiveScriptRemoval(t *testing.T) {
	// 验证大小写混合的 script 标签也能被移除
	input := `<SCRIPT type="text/javascript">var x=1;</SCRIPT>text`
	got := CleanContent(input, 0)
	if strings.Contains(got, "var") {
		t.Errorf("大写 SCRIPT 标签未被移除, got: %q", got)
	}
	if !strings.Contains(got, "text") {
		t.Errorf("正常文本不应被移除, got: %q", got)
	}
}

func TestCleanContent_ContentShorterThanMaxLen(t *testing.T) {
	// 验证内容长度小于 maxLen 时不截断
	input := "short"
	got := CleanContent(input, 100)
	if got != "short" {
		t.Errorf("短内容不应被截断, got: %q", got)
	}
}

// =============================================================================
// ExtractTitle 测试
// =============================================================================

func TestExtractTitle(t *testing.T) {
	tests := []struct {
		name string // 测试用例名称
		html string
		want string
	}{
		{
			name: "正常提取 title 标签内容",
			html: `<html><head><title>My Page Title</title></head></html>`,
			want: "My Page Title",
		},
		{
			name: "缺少 title 标签时返回 Untitled",
			html: `<html><head></head><body>No title here</body></html>`,
			want: "Untitled",
		},
		{
			name: "大小写不敏感 - 大写 TITLE",
			html: `<html><head><TITLE>Upper Case</TITLE></head></html>`,
			want: "Upper Case",
		},
		{
			name: "大小写不敏感 - 混合大小写",
			html: `<html><head><Title>Mixed Case</Title></head></html>`,
			want: "Mixed Case",
		},
		{
			name: "空白字符被 trim",
			html: `<title>  Spaces Around  </title>`,
			want: "Spaces Around",
		},
		{
			name: "空 HTML 返回 Untitled",
			html: ``,
			want: "Untitled",
		},
		{
			name: "中文标题",
			html: `<title>马蜂窝旅游攻略</title>`,
			want: "马蜂窝旅游攻略",
		},
		{
			name: "title 标签带属性",
			html: `<title lang="zh">带属性的标题</title>`,
			want: "带属性的标题",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ExtractTitle(tt.html)
			if got != tt.want {
				t.Errorf("ExtractTitle() = %q, want %q", got, tt.want)
			}
		})
	}
}

// =============================================================================
// ParseChineseNumber 测试
// =============================================================================

func TestParseChineseNumber(t *testing.T) {
	tests := []struct {
		name  string // 测试用例名称
		input string
		want  int
	}{
		{
			name:  "万为单位 - 1.2万 = 12000",
			input: "1.2万",
			want:  12000,
		},
		{
			name:  "万为单位 - 整数 3万",
			input: "3万",
			want:  30000,
		},
		{
			name:  "小写 k - 3.5k = 3500",
			input: "3.5k",
			want:  3500,
		},
		{
			name:  "大写 K - 2K = 2000",
			input: "2K",
			want:  2000,
		},
		{
			name:  "纯数字 - 123",
			input: "123",
			want:  123,
		},
		{
			name:  "空字符串返回 0",
			input: "",
			want:  0,
		},
		{
			name:  "无数字内容返回 0",
			input: "abc",
			want:  0,
		},
		{
			name:  "带空白的输入",
			input: "  456  ",
			want:  456,
		},
		{
			name:  "万为单位带小数 - 0.5万 = 5000",
			input: "0.5万",
			want:  5000,
		},
		{
			name:  "非法万格式返回 0",
			input: "abc万",
			want:  0,
		},
		{
			name:  "非法 k 格式返回 0",
			input: "abck",
			want:  0,
		},
		{
			name:  "k 的浮点精度 - 1.1k = 1100",
			input: "1.1k",
			want:  1100,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ParseChineseNumber(tt.input)
			if got != tt.want {
				t.Errorf("ParseChineseNumber(%q) = %d, want %d", tt.input, got, tt.want)
			}
		})
	}
}

// =============================================================================
// CalculateQualityScore 测试
// =============================================================================

func TestCalculateQualityScore_FullContent(t *testing.T) {
	// 所有维度都满分时，分数应接近 1.0
	title := strings.Repeat("好", 20)            // 20 rune → title 满分
	content := strings.Repeat("字", 2000)        // 2000 rune → content 满分
	author := "作者"                              // 有作者 → author 满分
	images := []string{"a", "b", "c", "d", "e"} // 5 张图 → images 满分
	views := 500
	likes := 500 // total = 1000 → interaction 满分

	score := CalculateQualityScore(title, content, author, images, views, likes)
	if score != 1.0 {
		t.Errorf("所有维度满分时分数应为 1.0, got: %f", score)
	}
}

func TestCalculateQualityScore_EmptyContent(t *testing.T) {
	// 所有维度为空时，分数应为 0.0
	score := CalculateQualityScore("", "", "", nil, 0, 0)
	if score != 0.0 {
		t.Errorf("所有维度为空时分数应为 0.0, got: %f", score)
	}
}

func TestCalculateQualityScore_PartialContent(t *testing.T) {
	// 部分内容有值时，分数应在 0 和 1 之间
	score := CalculateQualityScore("Hello", "Some content", "", nil, 0, 0)
	if score <= 0.0 || score >= 1.0 {
		t.Errorf("部分内容分数应在 (0, 1) 范围内, got: %f", score)
	}
}

func TestCalculateQualityScore_ScoreInRange(t *testing.T) {
	// 验证分数始终在 [0, 1] 范围内
	testCases := []struct {
		name    string
		title   string
		content string
		author  string
		images  []string
		views   int
		likes   int
	}{
		{"空值", "", "", "", nil, 0, 0},
		{"仅标题", "Title", "", "", nil, 0, 0},
		{"仅内容", "", "Content", "", nil, 0, 0},
		{"超长内容", strings.Repeat("x", 50000), strings.Repeat("x", 50000), "author", make([]string, 100), 999999, 999999},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			score := CalculateQualityScore(tc.title, tc.content, tc.author, tc.images, tc.views, tc.likes)
			if score < 0.0 || score > 1.0 {
				t.Errorf("分数必须在 [0, 1] 范围内, got: %f", score)
			}
		})
	}
}

func TestCalculateQualityScore_OnlyAuthor(t *testing.T) {
	// 仅有作者时应得 0.1 分（10%权重）
	score := CalculateQualityScore("", "", "author", nil, 0, 0)
	if score != 0.1 {
		t.Errorf("仅有作者时分数应为 0.1, got: %f", score)
	}
}

// =============================================================================
// DetermineCompletenessLevel 测试
// =============================================================================

func TestDetermineCompletenessLevel(t *testing.T) {
	tests := []struct {
		name       string // 测试用例名称
		hasTitle   bool
		hasContent bool
		contentLen int
		hasImages  bool
		hasAuthor  bool
		score      float64
		want       string
	}{
		{
			name:       "完整 - 满足所有条件",
			hasTitle:   true,
			hasContent: true,
			contentLen: 500,
			hasImages:  true,
			hasAuthor:  true,
			score:      0.8,
			want:       "complete",
		},
		{
			name:       "完整 - 内容超过 500 且高分",
			hasTitle:   true,
			hasContent: true,
			contentLen: 1000,
			hasImages:  true,
			hasAuthor:  true,
			score:      0.95,
			want:       "complete",
		},
		{
			name:       "可用 - 有标题+内容+图片但无作者",
			hasTitle:   true,
			hasContent: true,
			contentLen: 200,
			hasImages:  true,
			hasAuthor:  false,
			score:      0.5,
			want:       "usable",
		},
		{
			name:       "可用 - 内容不足 500 但超过 100",
			hasTitle:   true,
			hasContent: true,
			contentLen: 150,
			hasImages:  true,
			hasAuthor:  true,
			score:      0.7,
			want:       "usable",
		},
		{
			name:       "不完整 - 缺少标题",
			hasTitle:   false,
			hasContent: true,
			contentLen: 1000,
			hasImages:  true,
			hasAuthor:  true,
			score:      0.9,
			want:       "incomplete",
		},
		{
			name:       "不完整 - 缺少内容",
			hasTitle:   true,
			hasContent: false,
			contentLen: 0,
			hasImages:  true,
			hasAuthor:  true,
			score:      0.5,
			want:       "incomplete",
		},
		{
			name:       "不完整 - 所有条件缺失",
			hasTitle:   false,
			hasContent: false,
			contentLen: 0,
			hasImages:  false,
			hasAuthor:  false,
			score:      0.0,
			want:       "incomplete",
		},
		{
			name:       "不完整 - 有标题内容但无图片且内容不足 100",
			hasTitle:   true,
			hasContent: true,
			contentLen: 50,
			hasImages:  false,
			hasAuthor:  true,
			score:      0.3,
			want:       "incomplete",
		},
		{
			name:       "可用边界 - contentLen 恰好 100",
			hasTitle:   true,
			hasContent: true,
			contentLen: 100,
			hasImages:  true,
			hasAuthor:  false,
			score:      0.5,
			want:       "usable",
		},
		{
			name:       "完整边界 - score 恰好 0.8 且 contentLen 恰好 500",
			hasTitle:   true,
			hasContent: true,
			contentLen: 500,
			hasImages:  true,
			hasAuthor:  true,
			score:      0.8,
			want:       "complete",
		},
		{
			name:       "不完整 - score 低于 0.8 但其他条件满足",
			hasTitle:   true,
			hasContent: true,
			contentLen: 500,
			hasImages:  true,
			hasAuthor:  true,
			score:      0.79,
			want:       "usable",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := DetermineCompletenessLevel(tt.hasTitle, tt.hasContent, tt.contentLen, tt.hasImages, tt.hasAuthor, tt.score)
			if got != tt.want {
				t.Errorf("DetermineCompletenessLevel() = %q, want %q", got, tt.want)
			}
		})
	}
}

// =============================================================================
// ExtractExternalID 测试
// =============================================================================

func TestExtractExternalID(t *testing.T) {
	tests := []struct {
		name string // 测试用例名称
		url  string
		want string
	}{
		{
			name: "从 /i/ 路径提取 ID",
			url:  "https://www.mafengwo.cn/i/24648165.html",
			want: "24648165",
		},
		{
			name: "从 /note/ 路径提取 ID",
			url:  "https://www.mafengwo.cn/note/12345.html",
			want: "12345",
		},
		{
			name: "无匹配返回空字符串",
			url:  "https://www.google.com/search?q=test",
			want: "",
		},
		{
			name: "回退匹配 - 其他路径的数字 .html",
			url:  "https://www.example.com/article/99999.html",
			want: "99999",
		},
		{
			name: "空字符串返回空",
			url:  "",
			want: "",
		},
		{
			name: "无 .html 后缀不匹配",
			url:  "https://www.mafengwo.cn/i/24648165",
			want: "",
		},
		{
			name: "复杂 URL 路径中提取 /i/ ID",
			url:  "https://www.mafengwo.cn/travel/i/12345678.html?from=search",
			want: "12345678",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ExtractExternalID(tt.url)
			if got != tt.want {
				t.Errorf("ExtractExternalID(%q) = %q, want %q", tt.url, got, tt.want)
			}
		})
	}
}

// =============================================================================
// DetectPlatform 测试
// =============================================================================

func TestDetectPlatform(t *testing.T) {
	tests := []struct {
		name string // 测试用例名称
		url  string
		want string
	}{
		{
			name: "马蜂窝 URL",
			url:  "https://www.mafengwo.cn/i/24648165.html",
			want: "mafengwo",
		},
		{
			name: "马蜂窝 URL - 大写",
			url:  "https://www.MAFENGWO.cn/note/123.html",
			want: "mafengwo",
		},
		{
			name: "小红书 URL - 完整域名",
			url:  "https://www.xiaohongshu.com/explore/12345",
			want: "xiaohongshu",
		},
		{
			name: "小红书 URL - xhs 短域名",
			url:  "https://xhs.com/note/12345",
			want: "xiaohongshu",
		},
		{
			name: "小红书 URL - xhs 短链接",
			url:  "https://www.xhs.cn/discovery/item/abc123",
			want: "xiaohongshu",
		},
		{
			name: "未知平台",
			url:  "https://www.google.com/search?q=travel",
			want: "unknown",
		},
		{
			name: "空字符串",
			url:  "",
			want: "unknown",
		},
		{
			name: "小红书 URL - 大小写混合",
			url:  "https://www.XiaoHongShu.com/page",
			want: "xiaohongshu",
		},
		{
			name: "URL 中包含 mafengwo 子串",
			url:  "https://cdn.mafengwo.net/images/header.png",
			want: "mafengwo",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := DetectPlatform(tt.url)
			if got != tt.want {
				t.Errorf("DetectPlatform(%q) = %q, want %q", tt.url, got, tt.want)
			}
		})
	}
}
