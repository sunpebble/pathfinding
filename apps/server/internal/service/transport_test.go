package service

import (
	"math"
	"testing"
)

// almostEqual 判断两个浮点数在给定容差范围内是否相等
func almostEqual(a, b, delta float64) bool {
	return math.Abs(a-b) <= delta
}

// ---------- HaversineDistance 测试 ----------

// 测试已知城市间距离
func TestHaversineDistance_KnownCityPairs(t *testing.T) {
	tests := []struct {
		name    string
		lat1    float64
		lon1    float64
		lat2    float64
		lon2    float64
		wantKm  float64
		deltaKm float64
	}{
		{
			// 北京 → 上海，约 1067 公里
			name:    "Beijing to Shanghai",
			lat1:    39.9042,
			lon1:    116.4074,
			lat2:    31.2304,
			lon2:    121.4737,
			wantKm:  1067.0,
			deltaKm: 10.0,
		},
		{
			// 伦敦 → 纽约，约 5570 公里
			name:    "London to New York",
			lat1:    51.5074,
			lon1:    -0.1278,
			lat2:    40.7128,
			lon2:    -74.0060,
			wantKm:  5570.0,
			deltaKm: 30.0,
		},
		{
			// 东京 → 悉尼，约 7823 公里
			name:    "Tokyo to Sydney",
			lat1:    35.6762,
			lon1:    139.6503,
			lat2:    -33.8688,
			lon2:    151.2093,
			wantKm:  7823.0,
			deltaKm: 30.0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := HaversineDistance(tt.lat1, tt.lon1, tt.lat2, tt.lon2)
			if !almostEqual(got, tt.wantKm, tt.deltaKm) {
				t.Errorf("HaversineDistance() = %.2f km, want %.2f km (±%.0f km)", got, tt.wantKm, tt.deltaKm)
			}
		})
	}
}

// 测试同一个点到自身距离为 0
func TestHaversineDistance_SamePoint(t *testing.T) {
	tests := []struct {
		name string
		lat  float64
		lon  float64
	}{
		{name: "Origin (0,0)", lat: 0, lon: 0},
		{name: "Beijing", lat: 39.9042, lon: 116.4074},
		{name: "South pole", lat: -90.0, lon: 0.0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := HaversineDistance(tt.lat, tt.lon, tt.lat, tt.lon)
			if got != 0 {
				t.Errorf("HaversineDistance(same point) = %.6f km, want 0", got)
			}
		})
	}
}

// 测试对径点（地球上相对的两个点），距离约为半个地球周长 ~20015 km
func TestHaversineDistance_AntipodalPoints(t *testing.T) {
	tests := []struct {
		name   string
		lat1   float64
		lon1   float64
		lat2   float64
		lon2   float64
		wantKm float64
	}{
		{
			// 北极 → 南极
			name:   "North pole to South pole",
			lat1:   90.0,
			lon1:   0.0,
			lat2:   -90.0,
			lon2:   0.0,
			wantKm: 20015.0,
		},
		{
			// 赤道上的对径点
			name:   "Equatorial antipodal points",
			lat1:   0.0,
			lon1:   0.0,
			lat2:   0.0,
			lon2:   180.0,
			wantKm: 20015.0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := HaversineDistance(tt.lat1, tt.lon1, tt.lat2, tt.lon2)
			if !almostEqual(got, tt.wantKm, 100.0) {
				t.Errorf("HaversineDistance() = %.2f km, want ~%.0f km", got, tt.wantKm)
			}
		})
	}
}

// 测试距离对称性：A→B == B→A
func TestHaversineDistance_Symmetry(t *testing.T) {
	lat1, lon1 := 39.9042, 116.4074 // 北京
	lat2, lon2 := 31.2304, 121.4737 // 上海

	d1 := HaversineDistance(lat1, lon1, lat2, lon2)
	d2 := HaversineDistance(lat2, lon2, lat1, lon1)

	if d1 != d2 {
		t.Errorf("distance is not symmetric: A→B = %.6f, B→A = %.6f", d1, d2)
	}
}

// 测试非常近的两个点（约 100 米）
func TestHaversineDistance_VeryClosePoints(t *testing.T) {
	// 天安门广场上两个很近的点，间距约 0.1 km
	lat1, lon1 := 39.908700, 116.397500
	lat2, lon2 := 39.909600, 116.397500 // 向北约 100 米

	got := HaversineDistance(lat1, lon1, lat2, lon2)
	if got < 0.05 || got > 0.2 {
		t.Errorf("very close points distance = %.4f km, expected ~0.1 km", got)
	}
}

// 测试负经纬度坐标（南半球、西半球）
func TestHaversineDistance_NegativeCoordinates(t *testing.T) {
	// 布宜诺斯艾利斯 (-34.6, -58.4) → 开普敦 (-33.9, 18.4)，约 6860 km
	got := HaversineDistance(-34.6037, -58.3816, -33.9249, 18.4241)
	if !almostEqual(got, 6860.0, 50.0) {
		t.Errorf("Buenos Aires to Cape Town = %.2f km, want ~6860 km", got)
	}
}

// ---------- speedKmH 测试 ----------

// 测试所有已知交通模式及未知模式的返回速度
func TestSpeedKmH(t *testing.T) {
	tests := []struct {
		mode string
		want float64
	}{
		{mode: "walking", want: 5.0},
		{mode: "driving", want: 40.0},
		{mode: "transit", want: 25.0},
		// 未知模式，默认 25.0
		{mode: "cycling", want: 25.0},
		{mode: "", want: 25.0},
		{mode: "flying", want: 25.0},
		{mode: "WALKING", want: 25.0}, // 大写不匹配，走 default
	}

	for _, tt := range tests {
		t.Run("mode="+tt.mode, func(t *testing.T) {
			got := speedKmH(tt.mode)
			if got != tt.want {
				t.Errorf("speedKmH(%q) = %.1f, want %.1f", tt.mode, got, tt.want)
			}
		})
	}
}

// ---------- OptimizeRoute 测试 ----------

// 测试空 POI 列表
func TestOptimizeRoute_Empty(t *testing.T) {
	order, segments, savings := OptimizeRoute(nil, "driving")

	if len(order) != 0 {
		t.Errorf("empty: order length = %d, want 0", len(order))
	}
	if segments != nil {
		t.Errorf("empty: segments should be nil, got %v", segments)
	}
	if savings.DistanceKm != 0 || savings.DurationMinutes != 0 {
		t.Errorf("empty: savings should be zero, got %+v", savings)
	}
}

// 测试单个 POI
func TestOptimizeRoute_SinglePOI(t *testing.T) {
	pois := []TransportPOI{
		{Name: "故宫", Latitude: 39.9163, Longitude: 116.3972},
	}
	order, segments, savings := OptimizeRoute(pois, "walking")

	if len(order) != 1 || order[0] != 0 {
		t.Errorf("single: order = %v, want [0]", order)
	}
	if segments != nil {
		t.Errorf("single: segments should be nil, got %v", segments)
	}
	if savings.DistanceKm != 0 || savings.DurationMinutes != 0 {
		t.Errorf("single: savings should be zero, got %+v", savings)
	}
}

// 测试两个 POI — 结果应包含两个元素，顺序为 [0, 1]
func TestOptimizeRoute_TwoPOIs(t *testing.T) {
	pois := []TransportPOI{
		{Name: "故宫", Latitude: 39.9163, Longitude: 116.3972},
		{Name: "天坛", Latitude: 39.8822, Longitude: 116.4066},
	}
	order, segments, savings := OptimizeRoute(pois, "driving")

	// 两个 POI 的最近邻从 0 出发，必定访问 1
	if len(order) != 2 {
		t.Fatalf("two POIs: order length = %d, want 2", len(order))
	}
	if order[0] != 0 || order[1] != 1 {
		t.Errorf("two POIs: order = %v, want [0, 1]", order)
	}

	// 应该有 1 个 segment
	if len(segments) != 1 {
		t.Fatalf("two POIs: segments count = %d, want 1", len(segments))
	}
	if segments[0].From != "故宫" || segments[0].To != "天坛" {
		t.Errorf("two POIs: segment = %s → %s, want 故宫 → 天坛", segments[0].From, segments[0].To)
	}
	if segments[0].DistanceKm <= 0 {
		t.Errorf("two POIs: distance should be positive, got %.2f", segments[0].DistanceKm)
	}
	if segments[0].DurationMinutes <= 0 {
		t.Errorf("two POIs: duration should be positive, got %.2f", segments[0].DurationMinutes)
	}

	// 原始顺序与优化顺序相同，savings 应为 0
	if savings.DistanceKm != 0 {
		t.Errorf("two POIs: distance savings = %.2f, want 0 (same order)", savings.DistanceKm)
	}
}

// 测试三角形三点，验证最近邻选择最优路径
func TestOptimizeRoute_TriangleThreePOIs(t *testing.T) {
	// 构造一个三角形：A(0,0), B(0,1), C(1,0)
	// 从 A 出发，B 和 C 距离相近，算法应选择较近的点先走
	// A→B ≈ 111 km, A→C ≈ 111 km, B→C ≈ 157 km
	// 但我们把 B 放得更近：A(0,0), B(0,0.5), C(0,2)
	// A→B ≈ 55 km, A→C ≈ 222 km, B→C ≈ 167 km
	// 最近邻从 A：先去 B(近)，再去 C，路径 A→B→C = 55+167 = 222
	// 原始顺序 A→B→C 也一样，所以 savings = 0
	// 更好的测试：打乱原始顺序，让 A(0,0), C(0,2), B(0,0.5)
	pois := []TransportPOI{
		{Name: "A", Latitude: 0, Longitude: 0},
		{Name: "C", Latitude: 0, Longitude: 2},   // 远
		{Name: "B", Latitude: 0, Longitude: 0.5}, // 近
	}

	order, segments, savings := OptimizeRoute(pois, "driving")

	// 最近邻从 A(idx=0) 出发，应先去 B(idx=2，最近)，再去 C(idx=1)
	if len(order) != 3 {
		t.Fatalf("triangle: order length = %d, want 3", len(order))
	}
	if order[0] != 0 {
		t.Errorf("triangle: should start at index 0, got %d", order[0])
	}
	if order[1] != 2 {
		t.Errorf("triangle: second should be index 2 (B, nearest), got %d", order[1])
	}
	if order[2] != 1 {
		t.Errorf("triangle: third should be index 1 (C), got %d", order[2])
	}

	// 应该有 2 个 segment
	if len(segments) != 2 {
		t.Fatalf("triangle: segments count = %d, want 2", len(segments))
	}

	// 优化后距离更短，原始 A→C→B 比优化后 A→B→C 要长，savings 应为正
	if savings.DistanceKm <= 0 {
		t.Errorf("triangle: savings should be positive, got %.2f km", savings.DistanceKm)
	}
}

// 测试北京五大地标的路线优化
func TestOptimizeRoute_BeijingLandmarks(t *testing.T) {
	// 故意按照非最优顺序排列，让算法优化
	pois := []TransportPOI{
		{Name: "故宫", Latitude: 39.9163, Longitude: 116.3972},        // 市中心
		{Name: "八达岭长城", Latitude: 40.4319, Longitude: 116.5704},     // 最北，远离市区
		{Name: "天坛", Latitude: 39.8822, Longitude: 116.4066},        // 市中心偏南
		{Name: "颐和园", Latitude: 39.9998, Longitude: 116.2755},       // 西北方向
		{Name: "鸟巢/奥林匹克公园", Latitude: 39.9929, Longitude: 116.3966}, // 市中心偏北
	}

	order, segments, savings := OptimizeRoute(pois, "driving")

	// 基本约束验证
	if len(order) != 5 {
		t.Fatalf("beijing: order length = %d, want 5", len(order))
	}
	if order[0] != 0 {
		t.Errorf("beijing: should start at index 0 (故宫), got %d", order[0])
	}

	// 验证 order 是 [0..4] 的一个排列
	seen := make(map[int]bool)
	for _, idx := range order {
		if idx < 0 || idx >= 5 {
			t.Fatalf("beijing: invalid index %d in order", idx)
		}
		if seen[idx] {
			t.Fatalf("beijing: duplicate index %d in order", idx)
		}
		seen[idx] = true
	}

	// 应该有 4 个 segment
	if len(segments) != 4 {
		t.Fatalf("beijing: segments count = %d, want 4", len(segments))
	}

	// 验证 segments 中每一段的 From/To 与 order 一致
	for i, seg := range segments {
		expectedFrom := pois[order[i]].Name
		expectedTo := pois[order[i+1]].Name
		if seg.From != expectedFrom || seg.To != expectedTo {
			t.Errorf("beijing: segment[%d] = %s→%s, want %s→%s",
				i, seg.From, seg.To, expectedFrom, expectedTo)
		}
		if seg.DistanceKm <= 0 {
			t.Errorf("beijing: segment[%d] distance should be positive, got %.2f", i, seg.DistanceKm)
		}
		if seg.DurationMinutes <= 0 {
			t.Errorf("beijing: segment[%d] duration should be positive, got %.2f", i, seg.DurationMinutes)
		}
	}

	// 原始顺序故意不佳（故宫→长城→天坛→颐和园→鸟巢），优化后 savings 应为正
	if savings.DistanceKm < 0 {
		t.Errorf("beijing: distance savings should be non-negative, got %.2f km", savings.DistanceKm)
	}
	if savings.DurationMinutes < 0 {
		t.Errorf("beijing: duration savings should be non-negative, got %.2f min", savings.DurationMinutes)
	}

	// 验证最近邻算法不会先去最远的长城（index 1），除非它是起点的最近邻
	// 故宫到各点大致距离：天坛 ~4km, 鸟巢 ~8.5km, 颐和园 ~12km, 长城 ~60km
	// 所以 order[1] 不应为 1（长城）
	if order[1] == 1 {
		t.Errorf("beijing: nearest-neighbor should not visit Great Wall (idx=1) second from Forbidden City")
	}

	// 确认总优化距离合理（5 个北京景点之间总路程应在 30~200 km 内）
	totalDist := 0.0
	for _, seg := range segments {
		totalDist += seg.DistanceKm
	}
	if totalDist < 30 || totalDist > 200 {
		t.Errorf("beijing: total optimized distance = %.2f km, expected 30~200 km", totalDist)
	}

	t.Logf("北京路线优化结果:")
	t.Logf("  顺序: %v", order)
	for _, seg := range segments {
		t.Logf("  %s → %s: %.2f km, %.2f min", seg.From, seg.To, seg.DistanceKm, seg.DurationMinutes)
	}
	t.Logf("  节省: %.2f km, %.2f min", savings.DistanceKm, savings.DurationMinutes)
}

// 测试所有 POI 在同一位置 — 距离为零
func TestOptimizeRoute_AllSameLocation(t *testing.T) {
	pois := []TransportPOI{
		{Name: "A", Latitude: 39.9042, Longitude: 116.4074},
		{Name: "B", Latitude: 39.9042, Longitude: 116.4074},
		{Name: "C", Latitude: 39.9042, Longitude: 116.4074},
	}

	order, segments, savings := OptimizeRoute(pois, "walking")

	if len(order) != 3 {
		t.Fatalf("same location: order length = %d, want 3", len(order))
	}

	// 所有距离都应为零
	for i, seg := range segments {
		if seg.DistanceKm != 0 {
			t.Errorf("same location: segment[%d] distance = %.6f, want 0", i, seg.DistanceKm)
		}
		if seg.DurationMinutes != 0 {
			t.Errorf("same location: segment[%d] duration = %.6f, want 0", i, seg.DurationMinutes)
		}
	}

	if savings.DistanceKm != 0 || savings.DurationMinutes != 0 {
		t.Errorf("same location: savings should be zero, got %+v", savings)
	}
}

// 测试不同交通模式对 duration 的影响
func TestOptimizeRoute_ModesAffectDuration(t *testing.T) {
	pois := []TransportPOI{
		{Name: "故宫", Latitude: 39.9163, Longitude: 116.3972},
		{Name: "天坛", Latitude: 39.8822, Longitude: 116.4066},
	}

	modes := []string{"walking", "driving", "transit"}
	durations := make(map[string]float64)

	for _, mode := range modes {
		_, segments, _ := OptimizeRoute(pois, mode)
		if len(segments) != 1 {
			t.Fatalf("mode %s: expected 1 segment, got %d", mode, len(segments))
		}
		durations[mode] = segments[0].DurationMinutes

		// 所有模式的距离应相同（同一对点）
		if segments[0].DistanceKm <= 0 {
			t.Errorf("mode %s: distance should be positive", mode)
		}
	}

	// 步行最慢（速度 5），驾车最快（速度 40），公交居中（速度 25）
	if durations["walking"] <= durations["transit"] {
		t.Errorf("walking (%.2f min) should be slower than transit (%.2f min)",
			durations["walking"], durations["transit"])
	}
	if durations["transit"] <= durations["driving"] {
		t.Errorf("transit (%.2f min) should be slower than driving (%.2f min)",
			durations["transit"], durations["driving"])
	}
}

// 测试 segments 的 From/To 名称与 POI 名称一致
func TestOptimizeRoute_SegmentNamesMatch(t *testing.T) {
	pois := []TransportPOI{
		{Name: "Point-A", Latitude: 10.0, Longitude: 20.0},
		{Name: "Point-B", Latitude: 11.0, Longitude: 21.0},
		{Name: "Point-C", Latitude: 10.5, Longitude: 20.5},
	}

	order, segments, _ := OptimizeRoute(pois, "transit")

	for i := 0; i < len(segments); i++ {
		fromPOI := pois[order[i]]
		toPOI := pois[order[i+1]]
		if segments[i].From != fromPOI.Name {
			t.Errorf("segment[%d].From = %q, want %q", i, segments[i].From, fromPOI.Name)
		}
		if segments[i].To != toPOI.Name {
			t.Errorf("segment[%d].To = %q, want %q", i, segments[i].To, toPOI.Name)
		}
	}
}

// 测试边界：跨越本初子午线和日期变更线的坐标
func TestHaversineDistance_CrossMeridian(t *testing.T) {
	tests := []struct {
		name  string
		lat1  float64
		lon1  float64
		lat2  float64
		lon2  float64
		minKm float64
		maxKm float64
	}{
		{
			// 跨越本初子午线：伦敦 → 巴黎
			name: "Across prime meridian (London to Paris)",
			lat1: 51.5074, lon1: -0.1278,
			lat2: 48.8566, lon2: 2.3522,
			minKm: 330.0, maxKm: 360.0,
		},
		{
			// 跨越日期变更线附近
			name: "Across date line (Fiji to Samoa)",
			lat1: -17.7134, lon1: 178.0650,
			lat2: -13.7590, lon2: -172.1046,
			minKm: 1000.0, maxKm: 1200.0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := HaversineDistance(tt.lat1, tt.lon1, tt.lat2, tt.lon2)
			if got < tt.minKm || got > tt.maxKm {
				t.Errorf("distance = %.2f km, want between %.0f and %.0f km", got, tt.minKm, tt.maxKm)
			}
		})
	}
}

// 测试 OptimizeRoute 返回的 order 始终从 0 开始
func TestOptimizeRoute_AlwaysStartsAtZero(t *testing.T) {
	sizes := []int{2, 3, 4, 5}
	for _, n := range sizes {
		pois := make([]TransportPOI, n)
		for i := 0; i < n; i++ {
			pois[i] = TransportPOI{
				Name:      string(rune('A' + i)),
				Latitude:  float64(i) * 0.5,
				Longitude: float64(i) * 0.5,
			}
		}
		order, _, _ := OptimizeRoute(pois, "driving")
		if len(order) != n {
			t.Errorf("n=%d: order length = %d, want %d", n, len(order), n)
		}
		if order[0] != 0 {
			t.Errorf("n=%d: order[0] = %d, want 0", n, order[0])
		}
	}
}
