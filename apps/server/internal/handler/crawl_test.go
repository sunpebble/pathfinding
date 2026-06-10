package handler

import "testing"

// =============================================================================
// 计数解析 → HTTP 响应口径（设计 D4）
// =============================================================================

func TestOptionalCount_ParseFailureReturnsNil(t *testing.T) {
	// 解析失败必须透出 nil（JSON null），让 TS 侧回退 viewsRaw/likesRaw 重解析，
	// 绝不把失败伪造成计数 0
	if got := optionalCount(0, false); got != nil {
		t.Errorf("optionalCount(0, false) = %d, want nil", *got)
	}
}

func TestOptionalCount_SuccessReturnsValue(t *testing.T) {
	got := optionalCount(12000, true)
	if got == nil || *got != 12000 {
		t.Errorf("optionalCount(12000, true) = %v, want 12000", got)
	}
}

func TestOptionalCount_LiteralZeroIsValid(t *testing.T) {
	// ok=true 的 0 是字面量 0，必须原样透出而非 null
	got := optionalCount(0, true)
	if got == nil || *got != 0 {
		t.Errorf("optionalCount(0, true) = %v, want 0", got)
	}
}

func TestParseCount_PropagatesParseResult(t *testing.T) {
	tests := []struct {
		name   string
		raw    string
		want   int
		wantOK bool
	}{
		{name: "合法计数", raw: "1.2万", want: 12000, wantOK: true},
		{name: "空字符串失败", raw: "", wantOK: false},
		{name: "不可解析文本失败", raw: "看过的人很多", wantOK: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, ok := parseCount("views", tt.raw, "https://www.mafengwo.cn/i/1.html")
			if ok != tt.wantOK {
				t.Fatalf("parseCount(%q) ok = %v, want %v", tt.raw, ok, tt.wantOK)
			}
			if got != tt.want {
				t.Errorf("parseCount(%q) = %d, want %d", tt.raw, got, tt.want)
			}
		})
	}
}
