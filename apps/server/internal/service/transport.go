package service

import (
	"math"
)

// TransportSegment represents a segment between two POIs.
type TransportSegment struct {
	From            string  `json:"from"`
	To              string  `json:"to"`
	DistanceKm      float64 `json:"distanceKm"`
	DurationMinutes float64 `json:"durationMinutes"`
}

// TransportSavings represents route optimization savings.
type TransportSavings struct {
	DistanceKm      float64 `json:"distanceKm"`
	DurationMinutes float64 `json:"durationMinutes"`
}

// TransportPOI is a simple POI for transport optimization.
type TransportPOI struct {
	Name      string  `json:"name"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

// HaversineDistance calculates distance between two lat/lon points in km.
func HaversineDistance(lat1, lon1, lat2, lon2 float64) float64 {
	const R = 6371.0 // Earth radius in km
	dLat := (lat2 - lat1) * math.Pi / 180
	dLon := (lon2 - lon1) * math.Pi / 180
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1*math.Pi/180)*math.Cos(lat2*math.Pi/180)*
			math.Sin(dLon/2)*math.Sin(dLon/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return R * c
}

// speedKmH returns the assumed speed for a transport mode.
func speedKmH(mode string) float64 {
	switch mode {
	case "walking":
		return 5.0
	case "driving":
		return 40.0
	case "transit":
		return 25.0
	default:
		return 25.0
	}
}

// OptimizeRoute uses nearest-neighbor TSP heuristic.
// Returns optimized order (indices), segments, and savings vs original order.
func OptimizeRoute(pois []TransportPOI, mode string) ([]int, []TransportSegment, TransportSavings) {
	n := len(pois)
	if n <= 1 {
		order := make([]int, n)
		for i := range order {
			order[i] = i
		}
		return order, nil, TransportSavings{}
	}

	speed := speedKmH(mode)

	// Build distance matrix
	dist := make([][]float64, n)
	for i := range dist {
		dist[i] = make([]float64, n)
		for j := range dist[i] {
			if i != j {
				dist[i][j] = HaversineDistance(pois[i].Latitude, pois[i].Longitude, pois[j].Latitude, pois[j].Longitude)
			}
		}
	}

	// Nearest-neighbor TSP starting from index 0
	visited := make([]bool, n)
	order := make([]int, 0, n)
	current := 0
	visited[current] = true
	order = append(order, current)

	for len(order) < n {
		bestNext := -1
		bestDist := math.MaxFloat64
		for j := 0; j < n; j++ {
			if !visited[j] && dist[current][j] < bestDist {
				bestDist = dist[current][j]
				bestNext = j
			}
		}
		if bestNext == -1 {
			break
		}
		visited[bestNext] = true
		order = append(order, bestNext)
		current = bestNext
	}

	// Build segments for optimized route
	var segments []TransportSegment
	optimizedTotal := 0.0
	for i := 0; i < len(order)-1; i++ {
		d := dist[order[i]][order[i+1]]
		optimizedTotal += d
		segments = append(segments, TransportSegment{
			From:            pois[order[i]].Name,
			To:              pois[order[i+1]].Name,
			DistanceKm:      math.Round(d*100) / 100,
			DurationMinutes: math.Round(d/speed*60*100) / 100,
		})
	}

	// Calculate original route distance
	originalTotal := 0.0
	for i := 0; i < n-1; i++ {
		originalTotal += dist[i][i+1]
	}

	savings := TransportSavings{
		DistanceKm:      math.Round((originalTotal-optimizedTotal)*100) / 100,
		DurationMinutes: math.Round((originalTotal-optimizedTotal)/speed*60*100) / 100,
	}

	return order, segments, savings
}
