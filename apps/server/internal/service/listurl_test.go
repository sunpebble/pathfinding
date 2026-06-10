package service

import "testing"

func TestBuildMafengwoListURL_MddIDTakesPriority(t *testing.T) {
	// Arrange: mddId 与 city 同时存在时按 mddId 构造城市游记列表
	mddID := "10065"
	city := "北京"

	// Act
	listURL, cityScoped := BuildMafengwoListURL(mddID, city)

	// Assert
	if listURL != "https://m.mafengwo.cn/yj/10065/" {
		t.Errorf("mddId 应构造城市游记列表 URL, got: %s", listURL)
	}
	if !cityScoped {
		t.Error("mddId 列表必须是 city-scoped")
	}
}

func TestBuildMafengwoListURL_CityFallsBackToSearch(t *testing.T) {
	// Arrange: 无 mddId 但有 city → 站内搜索页，城市名必须 URL 转义
	city := "北京"

	// Act
	listURL, cityScoped := BuildMafengwoListURL("", city)

	// Assert
	want := "https://www.mafengwo.cn/search/q.php?q=%E5%8C%97%E4%BA%AC&t=notes"
	if listURL != want {
		t.Errorf("city 应构造转义后的站内搜索 URL, want %s, got %s", want, listURL)
	}
	if !cityScoped {
		t.Error("站内搜索结果必须是 city-scoped")
	}
}

func TestBuildMafengwoListURL_NoCityUsesGlobalFeed(t *testing.T) {
	// Arrange: mddId 与 city 都为空 → 全站 feed

	// Act
	listURL, cityScoped := BuildMafengwoListURL("", "")

	// Assert
	if listURL != "https://m.mafengwo.cn/note/" {
		t.Errorf("无城市参数应使用全站 feed, got: %s", listURL)
	}
	if cityScoped {
		t.Error("全站 feed 绝不能标记为 city-scoped（设计 D10）")
	}
}
