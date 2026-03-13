package handler

import (
	"encoding/json"
	"net/http"

	"github.com/pathfinding/server/internal/middleware"
	"github.com/pathfinding/server/internal/service"
)

func (h *Handler) HandleTransportOptimize(w http.ResponseWriter, r *http.Request) {
	var req struct {
		POIs []struct {
			Name      string  `json:"name"`
			Latitude  float64 `json:"latitude"`
			Longitude float64 `json:"longitude"`
		} `json:"pois"`
		TransportMode string `json:"transportMode"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		middleware.Error(w, 400, "Invalid JSON body")
		return
	}

	if len(req.POIs) == 0 {
		middleware.Error(w, 400, "At least one POI required")
		return
	}

	validModes := map[string]bool{"walking": true, "driving": true, "transit": true}
	if !validModes[req.TransportMode] {
		middleware.Error(w, 400, `Invalid transportMode: expected "walking", "driving", or "transit"`)
		return
	}

	// Convert to service POIs
	pois := make([]service.TransportPOI, len(req.POIs))
	for i, p := range req.POIs {
		pois[i] = service.TransportPOI{Name: p.Name, Latitude: p.Latitude, Longitude: p.Longitude}
	}

	order, segments, savings := service.OptimizeRoute(pois, req.TransportMode)

	middleware.JSON(w, 200, map[string]any{
		"optimizedOrder": order,
		"segments":       segments,
		"savings":        savings,
	})
}
