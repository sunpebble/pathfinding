package service

import (
	"math"
	"regexp"
	"strconv"
	"strings"
	"unicode/utf8"
)

var (
	// CleanContent patterns
	scriptTagRe    = regexp.MustCompile(`(?is)<script[^>]*>.*?</script>`)
	styleTagRe     = regexp.MustCompile(`(?is)<style[^>]*>.*?</style>`)
	htmlTagRe      = regexp.MustCompile(`<[^>]+>`)
	whitespaceRe   = regexp.MustCompile(`\s+`)

	// splitGuideParagraphs patterns
	horizSpaceRe   = regexp.MustCompile(`[ \t\f\v]+`)
	multiNewlineRe = regexp.MustCompile(`\n{3,}`)
	sentenceSplitRe = regexp.MustCompile(`[^。！？.!?]+[。！？.!?]?`)

	// cleanGuideText patterns
	nonNewlineSpaceRe    = regexp.MustCompile(`[^\S\n]+`)
	leadingPhotoCountRe  = regexp.MustCompile(`^\d+张照片\s*`)
	leadingGuideCountRe  = regexp.MustCompile(`^\d+篇游记\s*`)

	// cleanGuideText replacement patterns (compiled once, applied in order)
	guideTextReplacements = []struct {
		re    *regexp.Regexp
		value string
	}{
		{regexp.MustCompile(`图片加载失败`), " "},
		{regexp.MustCompile(`(?:^|\s)\.\d{1,2}\.\d{1,2}发布·[\d.万wWkK]+阅读\s*`), " "},
		{regexp.MustCompile(`\d{4}\.\d{1,2}\.\d{1,2}发布·[\d.万wWkK]+阅读\s*`), " "},
		{regexp.MustCompile(`目的地\s*-\s*出行时间·天数\s*-\s*人均费用\(人民币\)\s*-`), " "},
		{regexp.MustCompile(`出行人物\s*-`), " "},
		{regexp.MustCompile(`\bDAY\d+\s+NaN(?:\.NaN)?[^。！？\n]{0,120}`), " "},
		{regexp.MustCompile(`\bNaN(?:\.NaN)?\b`), " "},
		{regexp.MustCompile(`(?i)QQ\s*\d{5,12}`), " "},
		{regexp.MustCompile(`APP查看\s+[^。！？\n]{0,80}`), " "},
		{regexp.MustCompile(`(?:本游记)?著作权归@\S{0,40}`), " "},
		{regexp.MustCompile(`任何形式?转载[^。！？\n]{0,80}`), " "},
		{regexp.MustCompile(`任何转载请联系作者[^。！？\n]{0,40}`), " "},
		{regexp.MustCompile(`查看全部天?行程`), " "},
		{regexp.MustCompile(`举报`), " "},
	}

	// removeHeadMetadata patterns
	headPublishDateRe  = regexp.MustCompile(`\d{4}\.\d{1,2}\.\d{1,2}发布·[\d.万wWkK]+阅读\s*`)
	headAuthorCitiesRe = regexp.MustCompile(`(?:^|\s)\S{1,40}\s+\d+国\d+城\s*`)

	// removeMafengwoTripMeta pattern
	tripMetaMarkerRe = regexp.MustCompile(`关注\s+(?:目的地|出行时间|DAY\d)`)

	// truncateBeforeGuideBoilerplate patterns (compiled once, checked in order)
	boilerplateStopRes = []*regexp.Regexp{
		regexp.MustCompile(`本游记著作权归@`),
		regexp.MustCompile(`著作权归@`),
		regexp.MustCompile(`(?i)©\s*\d{4}\s*mafengwo\.cn`),
		regexp.MustCompile(`APP内查看更多游记`),
		regexp.MustCompile(`APP查看`),
		regexp.MustCompile(`温馨提示\s*APP阅读体验更佳`),
	}

	// isSmallThumbnailURL pattern
	smallThumbnailRe = regexp.MustCompile(`(?:^|[!/])(?:[1-9]\d|1[0-5]\d)x(?:[1-9]\d|1[0-5]\d)(?:[^\d]|$)`)

	// ExtractTitle pattern
	htmlTitleRe = regexp.MustCompile(`(?i)<title[^>]*>([^<]+)</title>`)

	// ExtractExternalID patterns
	externalIDRe         = regexp.MustCompile(`/(?:i|note)/(\d+)\.html`)
	externalIDFallbackRe = regexp.MustCompile(`(\d+)\.html`)
)

// CleanContent strips HTML tags, scripts, styles, collapses whitespace, and
// truncates to maxLen at a sentence boundary when possible.
// The second return value reports whether truncation occurred, so callers can
// expose contentTruncated instead of silently shipping cut-off text.
func CleanContent(html string, maxLen int) (string, bool) {
	if maxLen <= 0 {
		maxLen = 10000
	}
	// Remove script tags
	s := scriptTagRe.ReplaceAllString(html, "")
	// Remove style tags
	s = styleTagRe.ReplaceAllString(s, "")
	// Remove all HTML tags
	s = htmlTagRe.ReplaceAllString(s, " ")
	// Collapse whitespace
	s = whitespaceRe.ReplaceAllString(s, " ")
	s = strings.TrimSpace(s)

	runes := []rune(s)
	if len(runes) <= maxLen {
		return s, false
	}
	return strings.TrimSpace(string(truncateAtSentenceBoundary(runes[:maxLen]))), true
}

// sentenceEndRunes are the punctuation marks treated as sentence boundaries.
var sentenceEndRunes = map[rune]bool{
	'。': true, '！': true, '？': true, '；': true, '…': true,
	'.': true, '!': true, '?': true, ';': true,
}

// truncateAtSentenceBoundary cuts after the last sentence-ending rune,
// falling back to the hard cut when the boundary would discard more than
// half of the allowed length.
func truncateAtSentenceBoundary(runes []rune) []rune {
	for i := len(runes) - 1; i >= 0 && i+1 >= len(runes)/2; i-- {
		if sentenceEndRunes[runes[i]] {
			return runes[:i+1]
		}
	}
	return runes
}

// GenerateGuideMarkdownContent converts cleaned guide text and images into
// a structured Markdown article that mobile clients can render as rich text.
func GenerateGuideMarkdownContent(title, content string, imageURLs []string) string {
	content = cleanGuideText(content, title)
	if content == "" {
		return ""
	}

	parts := make([]string, 0, len(imageURLs)+4)
	title = strings.TrimSpace(strings.TrimLeft(title, "#>- \t"))
	if title != "" {
		parts = append(parts, "# "+title)
	}

	paragraphs := splitGuideParagraphs(content)
	images := filterGuideImageURLs(imageURLs)
	imageInterval := len(paragraphs) + 1
	if len(images) > 0 && len(paragraphs) > 0 {
		imageInterval = max(len(paragraphs)/(len(images)+1), 1)
	}

	imageIndex := 0
	for index, paragraph := range paragraphs {
		parts = append(parts, paragraph)
		if imageIndex < len(images) && (index+1)%imageInterval == 0 {
			altText := "游记图片 " + strconv.Itoa(imageIndex+1)
			parts = append(parts, "!["+altText+"]("+images[imageIndex]+")")
			imageIndex++
		}
	}

	for imageIndex < len(images) {
		altText := "游记图片 " + strconv.Itoa(imageIndex+1)
		parts = append(parts, "!["+altText+"]("+images[imageIndex]+")")
		imageIndex++
	}

	return strings.Join(parts, "\n\n")
}

func splitGuideParagraphs(content string) []string {
	content = strings.ReplaceAll(content, "\r\n", "\n")
	content = strings.ReplaceAll(content, "\r", "\n")
	content = horizSpaceRe.ReplaceAllString(content, " ")
	content = multiNewlineRe.ReplaceAllString(content, "\n\n")

	rawParagraphs := strings.Split(content, "\n\n")
	paragraphs := make([]string, 0, len(rawParagraphs))
	for _, paragraph := range rawParagraphs {
		paragraph = strings.TrimSpace(paragraph)
		if paragraph != "" {
			paragraphs = append(paragraphs, paragraph)
		}
	}

	if len(paragraphs) > 1 || utf8.RuneCountInString(content) <= 120 {
		return paragraphs
	}

	sentences := sentenceSplitRe.FindAllString(content, -1)
	if len(sentences) == 0 {
		return paragraphs
	}

	grouped := make([]string, 0, (len(sentences)+2)/3)
	for index := 0; index < len(sentences); index += 3 {
		end := min(index+3, len(sentences))
		paragraph := strings.TrimSpace(strings.Join(sentences[index:end], ""))
		if paragraph != "" {
			grouped = append(grouped, paragraph)
		}
	}
	if len(grouped) > 0 {
		return grouped
	}
	return paragraphs
}

func filterGuideImageURLs(imageURLs []string) []string {
	images := make([]string, 0, len(imageURLs))
	seen := map[string]bool{}
	for _, imageURL := range imageURLs {
		imageURL = strings.TrimSpace(imageURL)
		lower := strings.ToLower(imageURL)
		key := imageURL
		if questionIndex := strings.Index(key, "?"); questionIndex >= 0 {
			key = key[:questionIndex]
		}
		if (strings.HasPrefix(lower, "http://") || strings.HasPrefix(lower, "https://")) &&
			!strings.Contains(lower, "avatar") &&
			!strings.Contains(lower, "icon") &&
			!strings.Contains(lower, "logo") &&
			!strings.Contains(lower, "emoji") &&
			!isMafengwoChromeImage(lower) &&
			!isSmallThumbnailURL(lower) &&
			!seen[key] {
			seen[key] = true
			images = append(images, imageURL)
		}
	}
	return images
}

func cleanGuideText(content, title string) string {
	content = strings.ReplaceAll(content, "\r\n", "\n")
	content = strings.ReplaceAll(content, "\r", "\n")
	content = nonNewlineSpaceRe.ReplaceAllString(content, " ")
	content = multiNewlineRe.ReplaceAllString(content, "\n\n")
	content = strings.TrimSpace(content)

	content = truncateBeforeGuideBoilerplate(content)
	content = removeLeadingNoiseBeforeTitle(content, title)
	content = removeLeadingMafengwoBadges(content)
	content = leadingPhotoCountRe.ReplaceAllString(content, "")
	content = leadingGuideCountRe.ReplaceAllString(content, "")
	content = removeLeadingGuideTitle(content, title)

	content = removeHeadMetadata(content)
	content = removeMafengwoTripMeta(content)

	for _, r := range guideTextReplacements {
		content = r.re.ReplaceAllString(content, r.value)
	}

	content = nonNewlineSpaceRe.ReplaceAllString(content, " ")
	content = multiNewlineRe.ReplaceAllString(content, "\n\n")
	return strings.TrimSpace(content)
}

func removeLeadingNoiseBeforeTitle(content, title string) string {
	title = strings.TrimSpace(title)
	if title == "" {
		return content
	}

	titleIndex := strings.Index(content, title)
	if titleIndex > 0 && titleIndex <= 1800 {
		return strings.TrimSpace(content[titleIndex:])
	}
	return content
}

// earliestIndex returns the byte index and length of the first marker found in
// s within maxOffset bytes (maxOffset <= 0 means no limit). Returns -1, 0 if
// none found.
func earliestIndex(s string, maxOffset int, markers ...string) (idx, length int) {
	idx = -1
	for _, m := range markers {
		i := strings.Index(s, m)
		if i < 0 {
			continue
		}
		if maxOffset > 0 && i > maxOffset {
			continue
		}
		if idx < 0 || i < idx {
			idx = i
			length = len(m)
		}
	}
	return idx, length
}

func removeLeadingMafengwoBadges(content string) string {
	idx, length := earliestIndex(content, 1800, "星级游记", "蜂首游记", "宝藏游记")
	if idx >= 0 {
		return strings.TrimSpace(content[idx+length:])
	}
	return content
}

func removeHeadMetadata(content string) string {
	headRunes := []rune(content)
	if len(headRunes) > 800 {
		headRunes = headRunes[:800]
	}

	head := string(headRunes)
	head = headPublishDateRe.ReplaceAllString(head, " ")
	head = headAuthorCitiesRe.ReplaceAllString(head, " ")

	if utf8.RuneCountInString(content) <= 800 {
		return head
	}
	return head + string([]rune(content)[800:])
}

func removeMafengwoTripMeta(content string) string {
	followIndex := strings.Index(content, "关注 ")
	if followIndex < 0 {
		followIndex = strings.Index(content, "关注")
	}
	if followIndex < 0 || followIndex > 1080 {
		return content
	}

	metaLead := content[followIndex:]
	metaLeadRunes := []rune(metaLead)
	if len(metaLeadRunes) > 80 {
		metaLead = string(metaLeadRunes[:80])
	}
	if !tripMetaMarkerRe.MatchString(metaLead) {
		return content
	}

	relIdx, markerLen := earliestIndex(content[followIndex:], 3600, "查看全部天行程", "查看全部行程")
	if relIdx >= 0 {
		markerIndex := followIndex + relIdx
		return content[:followIndex] + " " + content[markerIndex+markerLen:]
	}
	return content[:followIndex]
}

func truncateBeforeGuideBoilerplate(content string) string {
	endIndex := len(content)
	for _, re := range boilerplateStopRes {
		match := re.FindStringIndex(content)
		if len(match) > 0 && match[0] < endIndex {
			endIndex = match[0]
		}
	}
	return content[:endIndex]
}

func removeLeadingGuideTitle(content, title string) string {
	title = strings.TrimSpace(title)
	if title == "" {
		return content
	}

	if rest, ok := strings.CutPrefix(content, title); ok {
		return strings.TrimSpace(rest)
	}
	return content
}

func isSmallThumbnailURL(imageURL string) bool {
	return smallThumbnailRe.MatchString(imageURL)
}

func isMafengwoChromeImage(imageURL string) bool {
	return strings.Contains(imageURL, "cond2msdrkprszmfaaaoxgnzvzm.png")
}

// ExtractTitle extracts the <title> tag content from HTML.
func ExtractTitle(html string) string {
	m := htmlTitleRe.FindStringSubmatch(html)
	if len(m) > 1 {
		return strings.TrimSpace(m[1])
	}
	return "Untitled"
}

// countMultipliers 是计数单位后缀到倍数的映射（与 TS parseChineseNumber 对齐，设计 D4）。
var countMultipliers = map[string]float64{
	"万": 10_000,
	"w": 10_000,
	"亿": 100_000_000,
	"k": 1_000,
}

// countPattern 匹配「数字部分 + 可选单位后缀」：
// 数字部分为严格千分位分组（3,456）或普通数字（1234、1.2）。
var countPattern = regexp.MustCompile(`^(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)([万亿wkWK])?$`)

// ParseChineseNumber 将中文计数字符串（如 "1.2万"、"3.5k"、"3,456"、"123"）解析为 int。
// 契约与 TS parseChineseNumber 完全一致（设计 D4）：解析失败返回 ok=false，
// 绝不把失败伪造成 0——ok=true 且值为 0 仅出现在字面量 0。
// 调用方必须让失败可见（HTTP 响应置 null / 记录告警），而非当作计数 0 入库。
func ParseChineseNumber(s string) (int, bool) {
	m := countPattern.FindStringSubmatch(strings.TrimSpace(s))
	if m == nil {
		return 0, false
	}

	value, err := strconv.ParseFloat(strings.ReplaceAll(m[1], ",", ""), 64)
	if err != nil {
		return 0, false
	}

	unit := strings.ToLower(m[2])
	if unit == "" {
		return int(math.Round(value)), true
	}
	multiplier, ok := countMultipliers[unit]
	if !ok {
		return 0, false
	}
	return int(math.Round(value * multiplier)), true
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

// ExtractExternalID extracts a numeric ID from a URL like "/i/24648165.html" → "24648165".
func ExtractExternalID(url string) string {
	m := externalIDRe.FindStringSubmatch(url)
	if len(m) > 1 {
		return m[1]
	}
	// Fallback: any number sequence at end
	m = externalIDFallbackRe.FindStringSubmatch(url)
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
