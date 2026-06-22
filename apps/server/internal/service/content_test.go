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
	got, _ := CleanContent(input, 0)
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
	got, _ := CleanContent(input, 0)
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
	got, _ := CleanContent(input, 0)
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
	got, _ := CleanContent(input, 0)
	if strings.Contains(got, "  ") {
		t.Errorf("连续空白未被折叠, got: %q", got)
	}
}

func TestCleanContent_TruncatesByRuneCount(t *testing.T) {
	// 验证按 rune 数量截断，而非字节数（中文字符场景）
	input := "这是一段中文测试内容用于验证截断功能"
	got, _ := CleanContent(input, 5)
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
	got, _ := CleanContent("", 100)
	if got != "" {
		t.Errorf("空输入应返回空字符串, got: %q", got)
	}
}

func TestCleanContent_NestedTags(t *testing.T) {
	// 验证嵌套标签被正确移除
	input := `<div><p><span>深层嵌套</span></p></div>`
	got, _ := CleanContent(input, 0)
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
	got, _ := CleanContent(input, 0)
	runes := []rune(got)
	if len(runes) != 10000 {
		t.Errorf("maxLen=0 时应使用默认值 10000, got %d runes", len(runes))
	}
}

func TestCleanContent_NegativeMaxLen(t *testing.T) {
	// 验证 maxLen 为负数时使用默认值 10000
	input := strings.Repeat("b", 15000)
	got, _ := CleanContent(input, -1)
	runes := []rune(got)
	if len(runes) != 10000 {
		t.Errorf("maxLen=-1 时应使用默认值 10000, got %d runes", len(runes))
	}
}

func TestCleanContent_CaseInsensitiveScriptRemoval(t *testing.T) {
	// 验证大小写混合的 script 标签也能被移除
	input := `<SCRIPT type="text/javascript">var x=1;</SCRIPT>text`
	got, _ := CleanContent(input, 0)
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
	got, truncated := CleanContent(input, 100)
	if got != "short" {
		t.Errorf("短内容不应被截断, got: %q", got)
	}
	if truncated {
		t.Error("未截断时 truncated 应为 false")
	}
}

func TestCleanContent_TruncatedFlagSet(t *testing.T) {
	// 验证发生截断时返回 truncated=true
	input := strings.Repeat("字", 200)
	_, truncated := CleanContent(input, 100)
	if !truncated {
		t.Error("发生截断时 truncated 应为 true")
	}
}

func TestCleanContent_TruncatesAtSentenceBoundary(t *testing.T) {
	// 验证截断优先发生在句边界（句号后），而非硬切断句中
	input := "第一句话说完了。第二句还在继续说一些内容呢"
	got, truncated := CleanContent(input, 10)
	if !truncated {
		t.Error("超长内容应标记 truncated=true")
	}
	if got != "第一句话说完了。" {
		t.Errorf("应在句边界截断, got: %q", got)
	}
}

func TestCleanContent_HardCutWhenBoundaryTooEarly(t *testing.T) {
	// 验证句边界过早（截掉超过一半）时退回硬截断，保留长度
	input := "短。" + strings.Repeat("后面是没有标点的超长内容", 100)
	got, truncated := CleanContent(input, 50)
	if !truncated {
		t.Error("超长内容应标记 truncated=true")
	}
	runes := []rune(got)
	if len(runes) != 50 {
		t.Errorf("句边界过早时应硬截断为 50 个 rune, got %d: %q", len(runes), got)
	}
}

func TestGenerateGuideMarkdownContent_AddsTitleAndImages(t *testing.T) {
	got := GenerateGuideMarkdownContent(
		"北京攻略",
		"第一天到达北京，入住酒店后去了天安门广场。第二天游览故宫，建议提前预约。",
		[]string{"https://img.example.com/1.jpg", "https://img.example.com/avatar.png"},
	)

	if !strings.Contains(got, "# 北京攻略") {
		t.Errorf("应包含标题, got: %q", got)
	}
	if !strings.Contains(got, "第一天到达北京") {
		t.Errorf("应包含正文, got: %q", got)
	}
	if !strings.Contains(got, "![游记图片 1](https://img.example.com/1.jpg)") {
		t.Errorf("应包含有效图片 markdown, got: %q", got)
	}
	if strings.Contains(got, "avatar.png") {
		t.Errorf("应过滤头像图片, got: %q", got)
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

// 契约（设计 D4，与 TS parseChineseNumber 一致）：解析失败必须 ok=false，
// 绝不把失败伪造成 0；ok=true 且值为 0 仅出现在字面量 0。
func TestParseChineseNumber(t *testing.T) {
	tests := []struct {
		name   string // 测试用例名称
		input  string
		want   int
		wantOK bool
	}{
		{
			name:   "万为单位 - 1.2万 = 12000",
			input:  "1.2万",
			want:   12000,
			wantOK: true,
		},
		{
			name:   "万为单位 - 整数 3万",
			input:  "3万",
			want:   30000,
			wantOK: true,
		},
		{
			name:   "小写 k - 3.5k = 3500",
			input:  "3.5k",
			want:   3500,
			wantOK: true,
		},
		{
			name:   "大写 K - 2K = 2000",
			input:  "2K",
			want:   2000,
			wantOK: true,
		},
		{
			name:   "纯数字 - 123",
			input:  "123",
			want:   123,
			wantOK: true,
		},
		{
			name:   "字面量 0 是唯一合法的零值",
			input:  "0",
			want:   0,
			wantOK: true,
		},
		{
			name:   "千分位分组 - 3,456 = 3456",
			input:  "3,456",
			want:   3456,
			wantOK: true,
		},
		{
			name:   "亿为单位 - 1.5亿 = 150000000",
			input:  "1.5亿",
			want:   150000000,
			wantOK: true,
		},
		{
			name:   "w 等价于万 - 1.2w = 12000",
			input:  "1.2w",
			want:   12000,
			wantOK: true,
		},
		{
			name:   "带空白的输入",
			input:  "  456  ",
			want:   456,
			wantOK: true,
		},
		{
			name:   "万为单位带小数 - 0.5万 = 5000",
			input:  "0.5万",
			want:   5000,
			wantOK: true,
		},
		{
			name:   "k 的浮点精度 - 1.1k = 1100",
			input:  "1.1k",
			want:   1100,
			wantOK: true,
		},
		// 以下为解析失败用例：必须 ok=false，绝不返回伪造的计数
		{
			name:   "空字符串解析失败",
			input:  "",
			wantOK: false,
		},
		{
			name:   "无数字内容解析失败",
			input:  "abc",
			wantOK: false,
		},
		{
			name:   "非法万格式解析失败",
			input:  "abc万",
			wantOK: false,
		},
		{
			name:   "非法 k 格式解析失败",
			input:  "abck",
			wantOK: false,
		},
		{
			name:   "数字后带杂质解析失败 - 不得截取前缀数字",
			input:  "123人浏览",
			wantOK: false,
		},
		{
			name:   "非法千分位分组解析失败",
			input:  "12,34",
			wantOK: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, ok := ParseChineseNumber(tt.input)
			if ok != tt.wantOK {
				t.Fatalf("ParseChineseNumber(%q) ok = %v, want %v", tt.input, ok, tt.wantOK)
			}
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
