package model

import "time"

// ===========================================================================
// Generic API envelope
// ===========================================================================

// APIResponse is the standard envelope returned by every endpoint.
type APIResponse struct {
	Success bool   `json:"success"`
	Data    any    `json:"data,omitempty"`
	Error   string `json:"error,omitempty"`
}

// ===========================================================================
// Health
// ===========================================================================

type HealthResponse struct {
	Status    string `json:"status"`
	Timestamp string `json:"timestamp"`
	Uptime    string `json:"uptime,omitempty"`
	Database  string `json:"database,omitempty"`
}

// ===========================================================================
// Crawler Fetch
// ===========================================================================

type CrawlerFetchRequest struct {
	URL string `json:"url" validate:"required,url"`
}

type CrawlerFetchResponse struct {
	URL     string `json:"url"`
	Status  int    `json:"status"`
	Content string `json:"content"`
	Title   string `json:"title,omitempty"`
	Elapsed string `json:"elapsed"`
}

// ===========================================================================
// AI Chat
// ===========================================================================

type AIChatRequest struct {
	Message string `json:"message" validate:"required,min=1"`
	Context string `json:"context,omitempty"`
}

type AIChatResponse struct {
	Reply     string `json:"reply"`
	Model     string `json:"model,omitempty"`
	TokensIn  int    `json:"tokensIn,omitempty"`
	TokensOut int    `json:"tokensOut,omitempty"`
}

// ===========================================================================
// Weather
// ===========================================================================

type WeatherRequest struct {
	Lat float64 `json:"lat" validate:"required,latitude"`
	Lon float64 `json:"lon" validate:"required,longitude"`
}

type WeatherResponse struct {
	Temperature float64 `json:"temperature"`
	FeelsLike   float64 `json:"feelsLike"`
	Humidity    int     `json:"humidity"`
	Description string  `json:"description"`
	Icon        string  `json:"icon,omitempty"`
	WindSpeed   float64 `json:"windSpeed"`
	City        string  `json:"city,omitempty"`
}

// ===========================================================================
// Transport / Route
// ===========================================================================

type TransportPOI struct {
	Name      string  `json:"name" validate:"required"`
	Latitude  float64 `json:"latitude" validate:"required,latitude"`
	Longitude float64 `json:"longitude" validate:"required,longitude"`
}

type TransportRequest struct {
	POIs          []TransportPOI `json:"pois" validate:"required,min=2,dive"`
	TransportMode string         `json:"transportMode" validate:"required,oneof=driving walking cycling transit"`
}

type TransportLeg struct {
	From     TransportPOI `json:"from"`
	To       TransportPOI `json:"to"`
	Distance float64      `json:"distance"`
	Duration float64      `json:"duration"`
	Polyline string       `json:"polyline,omitempty"`
}

type TransportResponse struct {
	Legs          []TransportLeg `json:"legs"`
	TotalDistance float64        `json:"totalDistance"`
	TotalDuration float64        `json:"totalDuration"`
}

// ===========================================================================
// Mafengwo — Destination list
// ===========================================================================

type MafengwoListRequest struct {
	City        string `json:"city" validate:"required,min=1"`
	ScrollCount int    `json:"scrollCount" validate:"omitempty,min=1,max=50"`
}

type MafengwoListResponse struct {
	Destinations []MafengwoDestination `json:"destinations"`
	Total        int                   `json:"total"`
}

// ===========================================================================
// Mafengwo — Destination detail
// ===========================================================================

type MafengwoDestinationDetailRequest struct {
	MddID string `json:"mddId" validate:"required"`
}

type MafengwoDestinationDetailResponse struct {
	Destination MafengwoDestination `json:"destination"`
}

// ===========================================================================
// Mafengwo — POI list / detail
// ===========================================================================

type MafengwoPOIListRequest struct {
	DestinationID string `json:"destinationId" validate:"required"`
	Category      string `json:"category" validate:"omitempty,oneof=attraction restaurant hotel shopping"`
	Page          int    `json:"page" validate:"omitempty,min=1"`
	PageSize      int    `json:"pageSize" validate:"omitempty,min=1,max=100"`
}

type MafengwoPOIListResponse struct {
	POIs  []MafengwoPOI `json:"pois"`
	Total int           `json:"total"`
	Page  int           `json:"page"`
}

type MafengwoPOIDetailRequest struct {
	PoiID string `json:"poiId" validate:"required"`
}

type MafengwoPOIDetailResponse struct {
	POI MafengwoPOI `json:"poi"`
}

// ===========================================================================
// Mafengwo — Guide
// ===========================================================================

type MafengwoGuideListRequest struct {
	DestinationID string `json:"destinationId" validate:"required"`
	Page          int    `json:"page" validate:"omitempty,min=1"`
	PageSize      int    `json:"pageSize" validate:"omitempty,min=1,max=100"`
}

type MafengwoGuideListResponse struct {
	Guides []MafengwoGuide `json:"guides"`
	Total  int             `json:"total"`
	Page   int             `json:"page"`
}

type MafengwoGuideDetailRequest struct {
	GuideID string `json:"guideId" validate:"required"`
}

type MafengwoGuideDetailResponse struct {
	Guide MafengwoGuide `json:"guide"`
}

// ===========================================================================
// Mafengwo — QA
// ===========================================================================

type MafengwoQAListRequest struct {
	DestinationID string `json:"destinationId" validate:"required"`
	Page          int    `json:"page" validate:"omitempty,min=1"`
	PageSize      int    `json:"pageSize" validate:"omitempty,min=1,max=100"`
}

type MafengwoQAListResponse struct {
	Questions []MafengwoQA `json:"questions"`
	Total     int          `json:"total"`
	Page      int          `json:"page"`
}

type MafengwoQADetailRequest struct {
	QuestionID string `json:"questionId" validate:"required"`
}

type MafengwoQADetailResponse struct {
	Question MafengwoQA `json:"question"`
}

// ===========================================================================
// Mafengwo — Ranking
// ===========================================================================

type MafengwoRankingListRequest struct {
	DestinationID string `json:"destinationId" validate:"required"`
	Category      string `json:"category" validate:"omitempty"`
}

type MafengwoRankingListResponse struct {
	Rankings []MafengwoRanking `json:"rankings"`
	Total    int               `json:"total"`
}

type MafengwoRankingDetailRequest struct {
	RankingID string `json:"rankingId" validate:"required"`
}

type MafengwoRankingDetailResponse struct {
	Ranking MafengwoRanking `json:"ranking"`
}

// ===========================================================================
// Mafengwo — Batch operations
// ===========================================================================

type BatchDestination struct {
	MddID string `json:"mddId" validate:"required"`
	Name  string `json:"name" validate:"required"`
	URL   string `json:"url" validate:"omitempty,url"`
}

type MafengwoBatchRequest struct {
	Destinations []BatchDestination `json:"destinations" validate:"required,min=1,dive"`
	DataTypes    []string           `json:"dataTypes" validate:"required,min=1,dive,oneof=destination poi guide qa ranking"`
	ScrollCount  int                `json:"scrollCount" validate:"omitempty,min=1,max=50"`
	Concurrency  int                `json:"concurrency" validate:"omitempty,min=1,max=10"`
}

type BatchResultItem struct {
	MddID    string `json:"mddId"`
	Name     string `json:"name"`
	DataType string `json:"dataType"`
	Status   string `json:"status"` // success / failed / skipped
	Count    int    `json:"count"`
	Error    string `json:"error,omitempty"`
}

type MafengwoBatchResponse struct {
	Results   []BatchResultItem `json:"results"`
	Total     int               `json:"total"`
	Succeeded int               `json:"succeeded"`
	Failed    int               `json:"failed"`
	Elapsed   string            `json:"elapsed"`
}

// ===========================================================================
// Mafengwo — Crawl task management
// ===========================================================================

type MafengwoCrawlTaskCreateRequest struct {
	TaskType   string `json:"taskType" validate:"required,oneof=destination poi guide qa ranking"`
	TargetURL  string `json:"targetUrl" validate:"required,url"`
	Priority   int    `json:"priority" validate:"omitempty,min=0,max=10"`
	MaxRetries int    `json:"maxRetries" validate:"omitempty,min=0,max=10"`
}

type MafengwoCrawlTaskListRequest struct {
	Status   string `json:"status" validate:"omitempty,oneof=pending running completed failed"`
	Page     int    `json:"page" validate:"omitempty,min=1"`
	PageSize int    `json:"pageSize" validate:"omitempty,min=1,max=100"`
}

type MafengwoCrawlTaskListResponse struct {
	Tasks []MafengwoCrawlTask `json:"tasks"`
	Total int                 `json:"total"`
	Page  int                 `json:"page"`
}

// ===========================================================================
// Travel Guide (synthesised / AI-generated)
// ===========================================================================

type TravelGuideListRequest struct {
	Destination string `json:"destination" validate:"omitempty"`
	Platform    string `json:"platform" validate:"omitempty,oneof=mafengwo ai-generated"`
	Page        int    `json:"page" validate:"omitempty,min=1"`
	PageSize    int    `json:"pageSize" validate:"omitempty,min=1,max=100"`
}

type TravelGuideListResponse struct {
	Guides []TravelGuide `json:"guides"`
	Total  int           `json:"total"`
	Page   int           `json:"page"`
}

type TravelGuideDetailRequest struct {
	ID int64 `json:"id" validate:"required"`
}

type TravelGuideDetailResponse struct {
	Guide TravelGuide `json:"guide"`
}

type TravelGuideGenerateRequest struct {
	Destination string `json:"destination" validate:"required,min=1"`
	Days        int    `json:"days" validate:"required,min=1,max=30"`
	Style       string `json:"style" validate:"omitempty"`
	Budget      string `json:"budget" validate:"omitempty"`
}

type TravelGuideGenerateResponse struct {
	Guide   TravelGuide `json:"guide"`
	Elapsed string      `json:"elapsed"`
}

// ===========================================================================
// Pagination helper (reusable)
// ===========================================================================

type PaginationRequest struct {
	Page     int `json:"page" validate:"omitempty,min=1"`
	PageSize int `json:"pageSize" validate:"omitempty,min=1,max=100"`
}

type PaginationMeta struct {
	Page       int `json:"page"`
	PageSize   int `json:"pageSize"`
	Total      int `json:"total"`
	TotalPages int `json:"totalPages"`
}

// Defaults applies sane defaults if the caller left fields at zero value.
func (p *PaginationRequest) Defaults() {
	if p.Page <= 0 {
		p.Page = 1
	}
	if p.PageSize <= 0 {
		p.PageSize = 20
	}
}

// ===========================================================================
// Search
// ===========================================================================

type SearchRequest struct {
	Query    string `json:"query" validate:"required,min=1"`
	Category string `json:"category" validate:"omitempty,oneof=destination poi guide qa"`
	Page     int    `json:"page" validate:"omitempty,min=1"`
	PageSize int    `json:"pageSize" validate:"omitempty,min=1,max=100"`
}

type SearchResponse struct {
	Results []SearchResult `json:"results"`
	Total   int            `json:"total"`
	Page    int            `json:"page"`
}

type SearchResult struct {
	Type      string     `json:"type"` // destination / poi / guide / qa
	ID        int64      `json:"id"`
	Title     string     `json:"title"`
	Snippet   string     `json:"snippet,omitempty"`
	URL       string     `json:"url,omitempty"`
	Score     float64    `json:"score,omitempty"`
	ImageURL  string     `json:"imageUrl,omitempty"`
	Timestamp *time.Time `json:"timestamp,omitempty"`
}
