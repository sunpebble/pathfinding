package model

import "time"

// JSONStringSlice is a helper type for database JSON columns that store
// a JSON array of strings (e.g. TEXT/JSON columns).
type JSONStringSlice []string

// ---------------------------------------------------------------------------
// MafengwoDestination — a crawled destination page from mafengwo.cn
// ---------------------------------------------------------------------------

type MafengwoDestination struct {
	ID               int64      `json:"id" db:"id"`
	MddID            string     `json:"mddId" db:"mdd_id"`
	SourceURL        string     `json:"sourceUrl" db:"source_url"`
	Name             string     `json:"name" db:"name"`
	NameEn           *string    `json:"nameEn,omitempty" db:"name_en"`
	Country          *string    `json:"country,omitempty" db:"country"`
	Province         *string    `json:"province,omitempty" db:"province"`
	Description      *string    `json:"description,omitempty" db:"description"`
	CoverImageURL    *string    `json:"coverImageUrl,omitempty" db:"cover_image_url"`
	ImageURLs        []string   `json:"imageUrls" db:"image_urls"`
	Latitude         *float64   `json:"latitude,omitempty" db:"latitude"`
	Longitude        *float64   `json:"longitude,omitempty" db:"longitude"`
	Timezone         *string    `json:"timezone,omitempty" db:"timezone"`
	BestTravelTime   *string    `json:"bestTravelTime,omitempty" db:"best_travel_time"`
	AvgStayDays      *string    `json:"avgStayDays,omitempty" db:"avg_stay_days"`
	Climate          *string    `json:"climate,omitempty" db:"climate"`
	Language         *string    `json:"language,omitempty" db:"language"`
	Currency         *string    `json:"currency,omitempty" db:"currency"`
	Visa             *string    `json:"visa,omitempty" db:"visa"`
	TravelNotesCount int        `json:"travelNotesCount" db:"travel_notes_count"`
	PoisCount        int        `json:"poisCount" db:"pois_count"`
	QuestionsCount   int        `json:"questionsCount" db:"questions_count"`
	GuidesCount      *int       `json:"guidesCount,omitempty" db:"guides_count"`
	CrawledAt        time.Time  `json:"crawledAt" db:"crawled_at"`
	UpdatedAt        *time.Time `json:"updatedAt,omitempty" db:"updated_at"`
}

// ---------------------------------------------------------------------------
// MafengwoPOI — a point-of-interest (attraction / restaurant / hotel / shopping)
// ---------------------------------------------------------------------------

type MafengwoPOI struct {
	ID              int64      `json:"id" db:"id"`
	PoiID           string     `json:"poiId" db:"poi_id"`
	SourceURL       string     `json:"sourceUrl" db:"source_url"`
	Name            string     `json:"name" db:"name"`
	NameEn          *string    `json:"nameEn,omitempty" db:"name_en"`
	Category        string     `json:"category" db:"category"` // attraction / restaurant / hotel / shopping
	DestinationID   *string    `json:"destinationId,omitempty" db:"destination_id"`
	DestinationName *string    `json:"destinationName,omitempty" db:"destination_name"`
	Address         *string    `json:"address,omitempty" db:"address"`
	Latitude        *float64   `json:"latitude,omitempty" db:"latitude"`
	Longitude       *float64   `json:"longitude,omitempty" db:"longitude"`
	Rating          *float64   `json:"rating,omitempty" db:"rating"`
	RatingCount     int        `json:"ratingCount" db:"rating_count"`
	PriceLevel      *int       `json:"priceLevel,omitempty" db:"price_level"`
	PriceRange      *string    `json:"priceRange,omitempty" db:"price_range"`
	TicketPrice     *string    `json:"ticketPrice,omitempty" db:"ticket_price"`
	OpeningHours    *string    `json:"openingHours,omitempty" db:"opening_hours"`
	Phone           *string    `json:"phone,omitempty" db:"phone"`
	Website         *string    `json:"website,omitempty" db:"website"`
	Description     *string    `json:"description,omitempty" db:"description"`
	Tips            []string   `json:"tips" db:"tips"`
	Highlights      []string   `json:"highlights" db:"highlights"`
	CoverImageURL   *string    `json:"coverImageUrl,omitempty" db:"cover_image_url"`
	ImageURLs       []string   `json:"imageUrls" db:"image_urls"`
	ReviewsCount    int        `json:"reviewsCount" db:"reviews_count"`
	SavesCount      int        `json:"savesCount" db:"saves_count"`
	Tags            []string   `json:"tags" db:"tags"`
	CuisineType     *string    `json:"cuisineType,omitempty" db:"cuisine_type"`
	SignatureDishes []string   `json:"signatureDishes" db:"signature_dishes"`
	StarRating      *int       `json:"starRating,omitempty" db:"star_rating"`
	Amenities       []string   `json:"amenities" db:"amenities"`
	CheckInTime     *string    `json:"checkInTime,omitempty" db:"check_in_time"`
	CheckOutTime    *string    `json:"checkOutTime,omitempty" db:"check_out_time"`
	QualityScore    int        `json:"qualityScore" db:"quality_score"`
	CrawledAt       time.Time  `json:"crawledAt" db:"crawled_at"`
	UpdatedAt       *time.Time `json:"updatedAt,omitempty" db:"updated_at"`
}

// ---------------------------------------------------------------------------
// MafengwoGuide — a travel guide / "gonglue" article
// ---------------------------------------------------------------------------

type MafengwoGuide struct {
	ID              int64      `json:"id" db:"id"`
	GuideID         string     `json:"guideId" db:"guide_id"`
	SourceURL       string     `json:"sourceUrl" db:"source_url"`
	Title           string     `json:"title" db:"title"`
	DestinationID   *string    `json:"destinationId,omitempty" db:"destination_id"`
	DestinationName *string    `json:"destinationName,omitempty" db:"destination_name"`
	AuthorName      *string    `json:"authorName,omitempty" db:"author_name"`
	AuthorURL       *string    `json:"authorUrl,omitempty" db:"author_url"`
	Content         *string    `json:"content,omitempty" db:"content"`
	Summary         *string    `json:"summary,omitempty" db:"summary"`
	CoverImageURL   *string    `json:"coverImageUrl,omitempty" db:"cover_image_url"`
	ImageURLs       []string   `json:"imageUrls" db:"image_urls"`
	Tags            []string   `json:"tags" db:"tags"`
	ViewCount       int        `json:"viewCount" db:"view_count"`
	LikeCount       int        `json:"likeCount" db:"like_count"`
	CommentCount    int        `json:"commentCount" db:"comment_count"`
	ShareCount      int        `json:"shareCount" db:"share_count"`
	PublishedAt     *time.Time `json:"publishedAt,omitempty" db:"published_at"`
	CrawledAt       time.Time  `json:"crawledAt" db:"crawled_at"`
	UpdatedAt       *time.Time `json:"updatedAt,omitempty" db:"updated_at"`
}

// ---------------------------------------------------------------------------
// MafengwoQA — a question & answer from the Q&A section
// ---------------------------------------------------------------------------

type BestAnswer struct {
	AuthorName string `json:"authorName" db:"best_answer_author"`
	Content    string `json:"content" db:"best_answer_content"`
	LikeCount  int    `json:"likeCount" db:"best_answer_likes"`
}

type MafengwoQA struct {
	ID              int64       `json:"id" db:"id"`
	QuestionID      string      `json:"questionId" db:"question_id"`
	SourceURL       string      `json:"sourceUrl" db:"source_url"`
	Title           string      `json:"title" db:"title"`
	Content         *string     `json:"content,omitempty" db:"content"`
	DestinationID   *string     `json:"destinationId,omitempty" db:"destination_id"`
	DestinationName *string     `json:"destinationName,omitempty" db:"destination_name"`
	AuthorName      *string     `json:"authorName,omitempty" db:"author_name"`
	Tags            []string    `json:"tags" db:"tags"`
	AnswerCount     int         `json:"answerCount" db:"answer_count"`
	ViewCount       int         `json:"viewCount" db:"view_count"`
	BestAnswer      *BestAnswer `json:"bestAnswer,omitempty" db:"best_answer"`
	CrawledAt       time.Time   `json:"crawledAt" db:"crawled_at"`
	UpdatedAt       *time.Time  `json:"updatedAt,omitempty" db:"updated_at"`
}

// ---------------------------------------------------------------------------
// MafengwoRanking — a ranking / leaderboard page
// ---------------------------------------------------------------------------

type RankingItem struct {
	Rank          int      `json:"rank"`
	Name          string   `json:"name"`
	PoiID         *string  `json:"poiId,omitempty"`
	Score         *float64 `json:"score,omitempty"`
	CoverImageURL *string  `json:"coverImageUrl,omitempty"`
	Description   *string  `json:"description,omitempty"`
}

type MafengwoRanking struct {
	ID              int64         `json:"id" db:"id"`
	RankingID       string        `json:"rankingId" db:"ranking_id"`
	SourceURL       string        `json:"sourceUrl" db:"source_url"`
	Title           string        `json:"title" db:"title"`
	Category        string        `json:"category" db:"category"`
	DestinationID   *string       `json:"destinationId,omitempty" db:"destination_id"`
	DestinationName *string       `json:"destinationName,omitempty" db:"destination_name"`
	Items           []RankingItem `json:"items" db:"items"`
	TotalItems      int           `json:"totalItems" db:"total_items"`
	CrawledAt       time.Time     `json:"crawledAt" db:"crawled_at"`
	UpdatedAt       *time.Time    `json:"updatedAt,omitempty" db:"updated_at"`
}

// ---------------------------------------------------------------------------
// MafengwoCrawlTask — tracks crawl job state
// ---------------------------------------------------------------------------

type MafengwoCrawlTask struct {
	ID           int64      `json:"id" db:"id"`
	TaskType     string     `json:"taskType" db:"task_type"` // destination / poi / guide / qa / ranking
	TargetURL    string     `json:"targetUrl" db:"target_url"`
	Status       string     `json:"status" db:"status"` // pending / running / completed / failed
	Priority     int        `json:"priority" db:"priority"`
	RetryCount   int        `json:"retryCount" db:"retry_count"`
	MaxRetries   int        `json:"maxRetries" db:"max_retries"`
	ErrorMessage *string    `json:"errorMessage,omitempty" db:"error_message"`
	ResultID     *int64     `json:"resultId,omitempty" db:"result_id"`
	ScheduledAt  *time.Time `json:"scheduledAt,omitempty" db:"scheduled_at"`
	StartedAt    *time.Time `json:"startedAt,omitempty" db:"started_at"`
	CompletedAt  *time.Time `json:"completedAt,omitempty" db:"completed_at"`
	CreatedAt    time.Time  `json:"createdAt" db:"created_at"`
	UpdatedAt    *time.Time `json:"updatedAt,omitempty" db:"updated_at"`
}

// ---------------------------------------------------------------------------
// TravelGuide — a synthesized / AI-generated travel guide
// ---------------------------------------------------------------------------

type GuideDestination struct {
	Name      string   `json:"name"`
	MddID     *string  `json:"mddId,omitempty"`
	Country   *string  `json:"country,omitempty"`
	Province  *string  `json:"province,omitempty"`
	Latitude  *float64 `json:"latitude,omitempty"`
	Longitude *float64 `json:"longitude,omitempty"`
}

type DayItinerary struct {
	Day           int      `json:"day"`
	Title         string   `json:"title"`
	Description   *string  `json:"description,omitempty"`
	POIs          []string `json:"pois"`
	Meals         []string `json:"meals,omitempty"`
	Accommodation *string  `json:"accommodation,omitempty"`
	Transport     *string  `json:"transport,omitempty"`
	Tips          []string `json:"tips,omitempty"`
}

type TravelGuide struct {
	ID            int64              `json:"id" db:"id"`
	ExternalID    string             `json:"externalId" db:"external_id"`
	Platform      string             `json:"platform" db:"platform"` // mafengwo / ai-generated
	Title         string             `json:"title" db:"title"`
	Content       *string            `json:"content,omitempty" db:"content"`
	AuthorName    *string            `json:"authorName,omitempty" db:"author_name"`
	SourceURL     string             `json:"sourceUrl" db:"source_url"`
	CoverImageURL *string            `json:"coverImageUrl,omitempty" db:"cover_image_url"`
	ImageURLs     []string           `json:"imageUrls" db:"image_urls"`
	Destinations  []GuideDestination `json:"destinations" db:"destinations"`
	Tags          []string           `json:"tags" db:"tags"`
	TravelDays    *int               `json:"travelDays,omitempty" db:"travel_days"`
	TravelMonth   *string            `json:"travelMonth,omitempty" db:"travel_month"`
	Budget        *string            `json:"budget,omitempty" db:"budget"`
	TravelStyle   *string            `json:"travelStyle,omitempty" db:"travel_style"`
	Itinerary     []DayItinerary     `json:"itinerary" db:"itinerary"`
	ViewCount     int                `json:"viewCount" db:"view_count"`
	LikeCount     int                `json:"likeCount" db:"like_count"`
	QualityScore  int                `json:"qualityScore" db:"quality_score"`
	PublishedAt   *time.Time         `json:"publishedAt,omitempty" db:"published_at"`
	LastUpdatedAt *time.Time         `json:"lastUpdatedAt,omitempty" db:"last_updated_at"`
	CreatedAt     time.Time          `json:"createdAt" db:"created_at"`
	UpdatedAt     *time.Time         `json:"updatedAt,omitempty" db:"updated_at"`
}
