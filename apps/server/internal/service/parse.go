package service

import (
	"errors"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"
)

// ---------------------------------------------------------------------------
// 评分解析（设计 D3）
// ---------------------------------------------------------------------------

// maxValidRating 是马蜂窝评分的上限；超出范围视为脏数据（如正则误抓的年份）。
const maxValidRating = 5.0

// ParseRating 将提取的评分字符串显式解析为 float64。
// 解析失败或超出 [0, 5] 范围时返回 ok=false，调用方必须存 NULL 而非 0。
func ParseRating(raw string) (float64, bool) {
	s := strings.TrimSpace(raw)
	if s == "" {
		return 0, false
	}
	f, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return 0, false
	}
	if f < 0 || f > maxValidRating {
		return 0, false
	}
	return f, true
}

// ---------------------------------------------------------------------------
// 发布时间解析（mafengwo_guides.published_at）
// ---------------------------------------------------------------------------

var publishedDateRe = regexp.MustCompile(`(\d{4})[-./](\d{1,2})[-./](\d{1,2})`)

// minPublishedYear 早于此年份的日期视为解析噪声（马蜂窝 2006 年上线）。
const minPublishedYear = 2000

// ParsePublishedDate 从提取的发布时间字符串解析日期。
// 支持 2023-05-20 / 2023.5.20 / 2023/5/20（可带「发布」等后缀）。
// 解析失败或日期非法（含未来一年以上、过早年份）返回 nil，存 NULL 而非零值。
func ParsePublishedDate(raw string) *time.Time {
	m := publishedDateRe.FindStringSubmatch(strings.TrimSpace(raw))
	if m == nil {
		return nil
	}

	parsed, err := time.Parse("2006-1-2", fmt.Sprintf("%s-%s-%s", m[1], m[2], m[3]))
	if err != nil {
		return nil
	}
	if parsed.Year() < minPublishedYear || parsed.Year() > time.Now().Year()+1 {
		return nil
	}
	return &parsed
}

// ---------------------------------------------------------------------------
// 空提取 / 反爬页检测（设计 D11）
// ---------------------------------------------------------------------------

// blockedPageMarkers 是马蜂窝验证码/风控页的特征词。
var blockedPageMarkers = []string{
	"验证码", "安全验证", "安全检查", "访问验证", "滑动验证", "访问异常", "captcha",
}

// shortContentRuneLimit 以内的正文才参与特征词匹配，
// 避免长篇正常游记中偶然提到「验证码」时被误判。
const shortContentRuneLimit = 200

// DetectExtractionFailure 判定提取结果是否为空壳或反爬页。
// 命中时返回失败原因（调用方必须 success:false 且不落库），正常返回 nil。
func DetectExtractionFailure(title, content string) error {
	trimmedTitle := strings.TrimSpace(title)
	trimmedContent := strings.TrimSpace(content)

	if trimmedTitle == "" && trimmedContent == "" {
		return errors.New("empty extraction: title and content are both empty")
	}

	lowerTitle := strings.ToLower(trimmedTitle)
	for _, marker := range blockedPageMarkers {
		if strings.Contains(lowerTitle, marker) {
			return fmt.Errorf("anti-bot page detected: title contains %q", marker)
		}
	}

	if utf8.RuneCountInString(trimmedContent) <= shortContentRuneLimit {
		lowerContent := strings.ToLower(trimmedContent)
		for _, marker := range blockedPageMarkers {
			if strings.Contains(lowerContent, marker) {
				return fmt.Errorf("anti-bot page detected: content contains %q", marker)
			}
		}
	}

	return nil
}

// ---------------------------------------------------------------------------
// ID 提取（设计 D3：poiId/questionId 必须经 struct 字段传递，禁止空 ID 入库）
// ---------------------------------------------------------------------------

var poiIDRe = regexp.MustCompile(`/poi/(\d+)\.html`)

// ExtractPOIID 从 POI URL（如 /poi/339.html）提取马蜂窝 POI ID，无匹配返回空串。
func ExtractPOIID(url string) string {
	m := poiIDRe.FindStringSubmatch(url)
	if len(m) > 1 {
		return m[1]
	}
	return ""
}

var qaIDRe = regexp.MustCompile(`/wenda/detail-(\d+)`)

// ExtractQAID 从问答 URL（如 /wenda/detail-23363201.html）提取问题 ID，无匹配返回空串。
func ExtractQAID(url string) string {
	m := qaIDRe.FindStringSubmatch(url)
	if len(m) > 1 {
		return m[1]
	}
	return ""
}
