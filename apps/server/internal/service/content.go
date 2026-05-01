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
		imageInterval = len(paragraphs) / (len(images) + 1)
		if imageInterval < 1 {
			imageInterval = 1
		}
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
	re := regexp.MustCompile(`[ \t\f\v]+`)
	content = re.ReplaceAllString(content, " ")
	re = regexp.MustCompile(`\n{3,}`)
	content = re.ReplaceAllString(content, "\n\n")

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

	sentenceRe := regexp.MustCompile(`[^。！？.!?]+[。！？.!?]?`)
	sentences := sentenceRe.FindAllString(content, -1)
	if len(sentences) == 0 {
		return paragraphs
	}

	grouped := make([]string, 0, (len(sentences)+2)/3)
	for index := 0; index < len(sentences); index += 3 {
		end := index + 3
		if end > len(sentences) {
			end = len(sentences)
		}
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
	re := regexp.MustCompile(`[^\S\n]+`)
	content = re.ReplaceAllString(content, " ")
	re = regexp.MustCompile(`\n{3,}`)
	content = re.ReplaceAllString(content, "\n\n")
	content = strings.TrimSpace(content)

	content = truncateBeforeGuideBoilerplate(content)
	content = removeLeadingNoiseBeforeTitle(content, title)
	content = removeLeadingMafengwoBadges(content)
	content = regexp.MustCompile(`^\d+张照片\s*`).ReplaceAllString(content, "")
	content = regexp.MustCompile(`^\d+篇游记\s*`).ReplaceAllString(content, "")
	content = removeLeadingGuideTitle(content, title)

	content = removeHeadMetadata(content)
	content = removeMafengwoTripMeta(content)

	replacements := []struct {
		pattern string
		value   string
	}{
		{`图片加载失败`, " "},
		{`(?:^|\s)\.\d{1,2}\.\d{1,2}发布·[\d.万wWkK]+阅读\s*`, " "},
		{`\d{4}\.\d{1,2}\.\d{1,2}发布·[\d.万wWkK]+阅读\s*`, " "},
		{`目的地\s*-\s*出行时间·天数\s*-\s*人均费用\(人民币\)\s*-`, " "},
		{`出行人物\s*-`, " "},
		{`\bDAY\d+\s+NaN(?:\.NaN)?[^。！？\n]{0,120}`, " "},
		{`\bNaN(?:\.NaN)?\b`, " "},
		{`(?i)QQ\s*\d{5,12}`, " "},
		{`APP查看\s+[^。！？\n]{0,80}`, " "},
		{`(?:本游记)?著作权归@\S{0,40}`, " "},
		{`任何形式?转载[^。！？\n]{0,80}`, " "},
		{`任何转载请联系作者[^。！？\n]{0,40}`, " "},
		{`查看全部天?行程`, " "},
		{`举报`, " "},
	}
	for _, replacement := range replacements {
		re = regexp.MustCompile(replacement.pattern)
		content = re.ReplaceAllString(content, replacement.value)
	}

	re = regexp.MustCompile(`[^\S\n]+`)
	content = re.ReplaceAllString(content, " ")
	re = regexp.MustCompile(`\n{3,}`)
	content = re.ReplaceAllString(content, "\n\n")
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

func removeLeadingMafengwoBadges(content string) string {
	badgeIndex := -1
	badgeLength := 0
	for _, badge := range []string{"星级游记", "蜂首游记", "宝藏游记"} {
		index := strings.Index(content, badge)
		if index >= 0 && index <= 1800 && (badgeIndex < 0 || index < badgeIndex) {
			badgeIndex = index
			badgeLength = len(badge)
		}
	}

	if badgeIndex >= 0 {
		return strings.TrimSpace(content[badgeIndex+badgeLength:])
	}
	return content
}

func removeHeadMetadata(content string) string {
	headRunes := []rune(content)
	if len(headRunes) > 800 {
		headRunes = headRunes[:800]
	}

	head := string(headRunes)
	head = regexp.MustCompile(`\d{4}\.\d{1,2}\.\d{1,2}发布·[\d.万wWkK]+阅读\s*`).ReplaceAllString(head, " ")
	head = regexp.MustCompile(`(?:^|\s)\S{1,40}\s+\d+国\d+城\s*`).ReplaceAllString(head, " ")

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
	if !regexp.MustCompile(`关注\s+(?:目的地|出行时间|DAY\d)`).MatchString(metaLead) {
		return content
	}

	markerIndex := -1
	markerLength := 0
	for _, marker := range []string{"查看全部天行程", "查看全部行程"} {
		index := strings.Index(content[followIndex:], marker)
		if index >= 0 {
			absoluteIndex := followIndex + index
			if markerIndex < 0 || absoluteIndex < markerIndex {
				markerIndex = absoluteIndex
				markerLength = len(marker)
			}
		}
	}

	if markerIndex >= 0 && markerIndex-followIndex <= 3600 {
		return content[:followIndex] + " " + content[markerIndex+markerLength:]
	}
	return content[:followIndex]
}

func truncateBeforeGuideBoilerplate(content string) string {
	stopPatterns := []string{
		`本游记著作权归@`,
		`著作权归@`,
		`(?i)©\s*\d{4}\s*mafengwo\.cn`,
		`APP内查看更多游记`,
		`APP查看`,
		`温馨提示\s*APP阅读体验更佳`,
	}

	endIndex := len(content)
	for _, pattern := range stopPatterns {
		match := regexp.MustCompile(pattern).FindStringIndex(content)
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

	if strings.HasPrefix(content, title) {
		return strings.TrimSpace(strings.TrimPrefix(content, title))
	}
	return content
}

func isSmallThumbnailURL(imageURL string) bool {
	re := regexp.MustCompile(`(?:^|[!/])(?:[1-9]\d|1[0-5]\d)x(?:[1-9]\d|1[0-5]\d)(?:[^\d]|$)`)
	return re.MatchString(imageURL)
}

func isMafengwoChromeImage(imageURL string) bool {
	return strings.Contains(imageURL, "cond2msdrkprszmfaaaoxgnzvzm.png")
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
