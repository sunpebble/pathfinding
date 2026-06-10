package service

import (
	"fmt"
	"net/url"
)

// BuildMafengwoListURL 构造游记列表抓取 URL（设计 D10：city 真正生效）。
//
// 优先级：
//  1. mddId 非空 → 城市游记列表页 https://m.mafengwo.cn/yj/{mddId}/（city-scoped）
//  2. 仅 city → 站内搜索页（按城市名搜游记，city-scoped）
//  3. 两者都无 → 全站最新游记 feed，cityScoped 必须为 false，
//     调用方不得把结果归属到任何城市。
func BuildMafengwoListURL(mddID, city string) (listURL string, cityScoped bool) {
	if mddID != "" {
		return fmt.Sprintf("https://m.mafengwo.cn/yj/%s/", url.PathEscape(mddID)), true
	}
	if city != "" {
		return "https://www.mafengwo.cn/search/q.php?q=" + url.QueryEscape(city) + "&t=notes", true
	}
	return "https://m.mafengwo.cn/note/", false
}
