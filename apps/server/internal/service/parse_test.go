package service

import (
	"strings"
	"testing"
	"time"
)

// =============================================================================
// ParseRating 测试（设计 D3：解析失败存 NULL，绝不写 0）
// =============================================================================

func TestParseRating(t *testing.T) {
	tests := []struct {
		name   string // 测试用例名称
		input  string
		want   float64
		wantOK bool
	}{
		{name: "正常小数评分", input: "4.5", want: 4.5, wantOK: true},
		{name: "整数评分", input: "5", want: 5, wantOK: true},
		{name: "合法的 0 分", input: "0", want: 0, wantOK: true},
		{name: "带空白", input: "  4.0  ", want: 4.0, wantOK: true},
		{name: "空字符串解析失败", input: "", wantOK: false},
		{name: "非数字解析失败", input: "abc", wantOK: false},
		{name: "超出上限视为脏数据", input: "45", wantOK: false},
		{name: "年份类脏数据", input: "2023.5", wantOK: false},
		{name: "负数视为脏数据", input: "-1", wantOK: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, ok := ParseRating(tt.input)
			if ok != tt.wantOK {
				t.Fatalf("ParseRating(%q) ok = %v, want %v", tt.input, ok, tt.wantOK)
			}
			if ok && got != tt.want {
				t.Errorf("ParseRating(%q) = %f, want %f", tt.input, got, tt.want)
			}
		})
	}
}

// =============================================================================
// ParsePublishedDate 测试
// =============================================================================

func TestParsePublishedDate(t *testing.T) {
	tests := []struct {
		name  string // 测试用例名称
		input string
		want  string // 期望日期（YYYY-MM-DD），空表示期望 nil
	}{
		{name: "横线分隔", input: "2023-05-20", want: "2023-05-20"},
		{name: "点分隔不补零", input: "2023.5.2", want: "2023-05-02"},
		{name: "斜线分隔", input: "2023/5/20", want: "2023-05-20"},
		{name: "带「发布」后缀", input: "2023.5.20发布", want: "2023-05-20"},
		{name: "空字符串返回 nil", input: "", want: ""},
		{name: "无日期内容返回 nil", input: "昨天发布", want: ""},
		{name: "非法月份返回 nil", input: "2023-13-40", want: ""},
		{name: "过早年份视为噪声", input: "1999-01-01", want: ""},
		{name: "远未来年份视为噪声", input: "2999-01-01", want: ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ParsePublishedDate(tt.input)
			if tt.want == "" {
				if got != nil {
					t.Errorf("ParsePublishedDate(%q) = %v, want nil", tt.input, got)
				}
				return
			}
			if got == nil {
				t.Fatalf("ParsePublishedDate(%q) = nil, want %s", tt.input, tt.want)
			}
			if got.Format(time.DateOnly) != tt.want {
				t.Errorf("ParsePublishedDate(%q) = %s, want %s", tt.input, got.Format(time.DateOnly), tt.want)
			}
		})
	}
}

// =============================================================================
// DetectExtractionFailure 测试（设计 D11：空提取/反爬页判失败，不落库）
// =============================================================================

func TestDetectExtractionFailure_EmptyTitleAndContent(t *testing.T) {
	// 标题与正文全空 → 判定失败
	err := DetectExtractionFailure("", "")
	if err == nil {
		t.Error("全空提取结果应判定失败")
	}
}

func TestDetectExtractionFailure_WhitespaceOnly(t *testing.T) {
	// 纯空白等价于全空
	err := DetectExtractionFailure("  ", "\n\t ")
	if err == nil {
		t.Error("纯空白提取结果应判定失败")
	}
}

func TestDetectExtractionFailure_CaptchaTitle(t *testing.T) {
	// 标题命中验证码特征 → 判定失败
	for _, title := range []string{"请输入验证码", "安全验证 - 马蜂窝", "安全检查", "Captcha Required"} {
		if err := DetectExtractionFailure(title, "一些正文"); err == nil {
			t.Errorf("标题 %q 应被判定为反爬页", title)
		}
	}
}

func TestDetectExtractionFailure_CaptchaInShortContent(t *testing.T) {
	// 短正文命中验证码特征 → 判定失败
	err := DetectExtractionFailure("马蜂窝", "请完成安全验证后继续访问")
	if err == nil {
		t.Error("短正文含验证码特征应被判定为反爬页")
	}
}

func TestDetectExtractionFailure_LongContentMentioningCaptcha(t *testing.T) {
	// 长篇正常游记中偶然提到「验证码」不应误判
	content := strings.Repeat("这是一篇很长的游记正文，记录了旅行中的见闻。", 20) + "取票时需要输入验证码。"
	if err := DetectExtractionFailure("北京七日游", content); err != nil {
		t.Errorf("长正文提及验证码不应误判, got: %v", err)
	}
}

func TestDetectExtractionFailure_NormalGuide(t *testing.T) {
	// 正常提取结果应通过
	if err := DetectExtractionFailure("北京七日游", "第一天去了故宫，第二天去了长城。"); err != nil {
		t.Errorf("正常提取结果不应判定失败, got: %v", err)
	}
}

func TestDetectExtractionFailure_TitleOnlyContentEmpty(t *testing.T) {
	// 仅标题非空（正文为空）不属于「均为空」，按设计 D11 不判失败
	if err := DetectExtractionFailure("北京七日游", ""); err != nil {
		t.Errorf("仅正文为空不应判定失败, got: %v", err)
	}
}

// =============================================================================
// ExtractPOIID / ExtractQAID 测试
// =============================================================================

func TestExtractPOIID(t *testing.T) {
	tests := []struct {
		name string // 测试用例名称
		url  string
		want string
	}{
		{name: "标准 POI URL", url: "https://www.mafengwo.cn/poi/339.html", want: "339"},
		{name: "移动版 POI URL", url: "https://m.mafengwo.cn/poi/5423409.html", want: "5423409"},
		{name: "非 POI URL 返回空", url: "https://www.mafengwo.cn/i/123.html", want: ""},
		{name: "空字符串返回空", url: "", want: ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := ExtractPOIID(tt.url); got != tt.want {
				t.Errorf("ExtractPOIID(%q) = %q, want %q", tt.url, got, tt.want)
			}
		})
	}
}

func TestExtractQAID(t *testing.T) {
	tests := []struct {
		name string // 测试用例名称
		url  string
		want string
	}{
		{name: "标准问答 URL", url: "https://www.mafengwo.cn/wenda/detail-23363201.html", want: "23363201"},
		{name: "移动版问答 URL", url: "https://m.mafengwo.cn/wenda/detail-100.html", want: "100"},
		{name: "非问答 URL 返回空", url: "https://www.mafengwo.cn/poi/339.html", want: ""},
		{name: "空字符串返回空", url: "", want: ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := ExtractQAID(tt.url); got != tt.want {
				t.Errorf("ExtractQAID(%q) = %q, want %q", tt.url, got, tt.want)
			}
		})
	}
}
