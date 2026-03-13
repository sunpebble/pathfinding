package service

import (
	"math"
	"regexp"
	"strconv"
	"strings"
	"unicode/utf8"
)

// CleanContent strips HTML tags, scripts, styles, collapses whitespace, truncates to maxLen.
func CleanContent(html string, maxLen int) string {
	if maxLen <= 0 {
		maxLen = 10000
	}
	// Remove script tags
	re := regexp.MustCompile(`(?is)<script[^>]*>.*?</script>`)
	s := re.ReplaceAllString(html, "")
	// Remove style tags
	re = regexp.MustCompile(`(?is)<style[^>]*>.*?</style>`)
	s = re.ReplaceAllString(s, "")
	// Remove all HTML tags
	re = regexp.MustCompile(`<[^>]+>`)
	s = re.ReplaceAllString(s, " ")
	// Collapse whitespace
	re = regexp.MustCompile(`\s+`)
	s = re.ReplaceAllString(s, " ")
	s = strings.TrimSpace(s)
	// Truncate
	if utf8.RuneCountInString(s) > maxLen {
		runes := []rune(s)
		s = string(runes[:maxLen])
	}
	return s
}

// ExtractTitle extracts the <title> tag content from HTML.
func ExtractTitle(html string) string {
	re := regexp.MustCompile(`(?i)<title[^>]*>([^<]+)</title>`)
	m := re.FindStringSubmatch(html)
	if len(m) > 1 {
		return strings.TrimSpace(m[1])
	}
	return "Untitled"
}

// ParseChineseNumber converts Chinese number strings like "1.2万", "3.5k", "123" to int.
func ParseChineseNumber(s string) int {
	s = strings.TrimSpace(s)
	if s == "" {
		return 0
	}
	if strings.Contains(s, "万") {
		s = strings.Replace(s, "万", "", 1)
		f, err := strconv.ParseFloat(s, 64)
		if err != nil {
			return 0
		}
		return int(math.Round(f * 10000))
	}
	lower := strings.ToLower(s)
	if strings.Contains(lower, "k") {
		s = strings.Replace(lower, "k", "", 1)
		f, err := strconv.ParseFloat(s, 64)
		if err != nil {
			return 0
		}
		return int(math.Round(f * 1000))
	}
	// Try parse as plain number
	re := regexp.MustCompile(`\d+`)
	m := re.FindString(s)
	if m == "" {
		return 0
	}
	n, _ := strconv.Atoi(m)
	return n
}

// CalculateQualityScore returns a 0-1 quality score.
// Weights: title(20%), content length(40%), author(10%), images(20%), interaction(10%)
func CalculateQualityScore(title, content, author string, images []string, views, likes int) float64 {
	score := 0.0
	// Title: 20%
	if len(title) > 0 {
		titleScore := math.Min(float64(utf8.RuneCountInString(title))/20.0, 1.0)
		score += titleScore * 0.2
	}
	// Content length: 40%
	contentLen := utf8.RuneCountInString(content)
	contentScore := math.Min(float64(contentLen)/2000.0, 1.0)
	score += contentScore * 0.4
	// Author: 10%
	if author != "" {
		score += 0.1
	}
	// Images: 20%
	imgScore := math.Min(float64(len(images))/5.0, 1.0)
	score += imgScore * 0.2
	// Interaction: 10%
	total := views + likes
	interScore := math.Min(float64(total)/1000.0, 1.0)
	score += interScore * 0.1
	return math.Round(score*100) / 100
}

// DetermineCompletenessLevel returns "complete", "usable", or "incomplete".
func DetermineCompletenessLevel(hasTitle, hasContent bool, contentLen int, hasImages, hasAuthor bool, score float64) string {
	if hasTitle && hasContent && contentLen >= 500 && hasImages && hasAuthor && score >= 0.8 {
		return "complete"
	}
	if hasTitle && hasContent && contentLen >= 100 && hasImages {
		return "usable"
	}
	return "incomplete"
}

// ExtractExternalID extracts a numeric ID from a URL like "/i/24648165.html" → "24648165".
func ExtractExternalID(url string) string {
	re := regexp.MustCompile(`/(?:i|note)/(\d+)\.html`)
	m := re.FindStringSubmatch(url)
	if len(m) > 1 {
		return m[1]
	}
	// Fallback: any number sequence at end
	re = regexp.MustCompile(`(\d+)\.html`)
	m = re.FindStringSubmatch(url)
	if len(m) > 1 {
		return m[1]
	}
	return ""
}

// DetectPlatform returns "mafengwo", "xiaohongshu", or "unknown".
func DetectPlatform(url string) string {
	lower := strings.ToLower(url)
	if strings.Contains(lower, "mafengwo") {
		return "mafengwo"
	}
	if strings.Contains(lower, "xiaohongshu") || strings.Contains(lower, "xhs") {
		return "xiaohongshu"
	}
	return "unknown"
}
