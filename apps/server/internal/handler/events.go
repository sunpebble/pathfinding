package handler

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/pathfinding/server/internal/eventbus"
	"github.com/pathfinding/server/internal/service"
)

// RegisterEventHandlers subscribes to all queue events.
func (h *Handler) RegisterEventHandlers() {
	// Travel guide save (from mafengwo detail crawler)
	h.EventBus.Subscribe("crawler.mafengwo.detail.completed", h.handleSaveTravelGuide)

	// Mafengwo data saver (from various crawlers)
	h.EventBus.Subscribe("crawler.mafengwo.destination.completed", h.handleSaveDestination)
	h.EventBus.Subscribe("crawler.mafengwo.poi.detail.completed", h.handleSavePOI)
	h.EventBus.Subscribe("crawler.mafengwo.guide.detail.completed", h.handleSaveGuide)
	h.EventBus.Subscribe("crawler.mafengwo.qa.detail.completed", h.handleSaveQA)
	h.EventBus.Subscribe("crawler.mafengwo.ranking.completed", h.handleSaveRanking)

	// Notification (stub)
	h.EventBus.Subscribe("notification.send", h.handleNotification)

	slog.Info("Event handlers registered", "count", 7)
}

func (h *Handler) handleSaveTravelGuide(ctx context.Context, event eventbus.Event) error {
	if h.DB == nil {
		slog.Warn("DB not configured, skipping travel guide save")
		return nil
	}

	data, err := json.Marshal(event.Data)
	if err != nil {
		return err
	}

	var payload struct {
		URL   string `json:"url"`
		Guide struct {
			Title       string   `json:"title"`
			Content     string   `json:"content"`
			ContentHTML string   `json:"contentHtml"`
			Author      string   `json:"author"`
			Views       int      `json:"views"`
			Likes       int      `json:"likes"`
			CoverImage  string   `json:"coverImage"`
			Images      []string `json:"images"`
			PublishedAt string   `json:"publishedAt"`
		} `json:"guide"`
	}
	if err := json.Unmarshal(data, &payload); err != nil {
		slog.Error("Failed to decode travel guide event", "error", err)
		return err
	}

	externalID := service.ExtractExternalID(payload.URL)
	qualityScore := service.CalculateQualityScore(
		payload.Guide.Title, payload.Guide.Content, payload.Guide.Author,
		payload.Guide.Images, payload.Guide.Views, payload.Guide.Likes,
	)

	imagesJSON, _ := json.Marshal(payload.Guide.Images)
	now := time.Now()

	_, err = h.DB.ExecContext(ctx, `
		INSERT INTO travel_guides (platform, external_id, title, content, author_name, source_url,
			cover_image_url, image_urls, view_count, like_count, quality_score, crawled_at, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON DUPLICATE KEY UPDATE
			title = VALUES(title), content = VALUES(content), author_name = VALUES(author_name),
			cover_image_url = VALUES(cover_image_url), image_urls = VALUES(image_urls),
			view_count = VALUES(view_count), like_count = VALUES(like_count),
			quality_score = VALUES(quality_score), updated_at = VALUES(updated_at)`,
		"mafengwo", externalID, payload.Guide.Title, payload.Guide.Content,
		payload.Guide.Author, payload.URL, payload.Guide.CoverImage, string(imagesJSON),
		payload.Guide.Views, payload.Guide.Likes, qualityScore, now, now, now,
	)
	if err != nil {
		slog.Error("Failed to save travel guide", "error", err, "externalId", externalID)
		return err
	}

	slog.Info("Saved travel guide", "externalId", externalID, "title", payload.Guide.Title)
	h.EventBus.Publish(ctx, eventbus.Event{
		Topic: "crawler.mafengwo.saved",
		Data:  map[string]any{"externalId": externalID, "success": true},
	})
	return nil
}

func (h *Handler) handleSaveDestination(ctx context.Context, event eventbus.Event) error {
	return h.upsertMafengwoData(ctx, "destination", event)
}

func (h *Handler) handleSavePOI(ctx context.Context, event eventbus.Event) error {
	return h.upsertMafengwoData(ctx, "poi", event)
}

func (h *Handler) handleSaveGuide(ctx context.Context, event eventbus.Event) error {
	return h.upsertMafengwoData(ctx, "guide", event)
}

func (h *Handler) handleSaveQA(ctx context.Context, event eventbus.Event) error {
	return h.upsertMafengwoData(ctx, "qa", event)
}

func (h *Handler) handleSaveRanking(ctx context.Context, event eventbus.Event) error {
	return h.upsertMafengwoData(ctx, "ranking", event)
}

func (h *Handler) upsertMafengwoData(ctx context.Context, dataType string, event eventbus.Event) error {
	if h.DB == nil {
		slog.Warn("DB not configured, skipping save", "dataType", dataType)
		return nil
	}

	data, err := json.Marshal(event.Data)
	if err != nil {
		return err
	}

	now := time.Now()
	var savedID string

	switch dataType {
	case "destination":
		var d struct {
			MddID            string   `json:"mddId"`
			SourceURL        string   `json:"sourceUrl"`
			Name             string   `json:"name"`
			NameEn           string   `json:"nameEn"`
			Description      string   `json:"description"`
			CoverImageURL    string   `json:"coverImageUrl"`
			ImageURLs        []string `json:"imageUrls"`
			BestTravelTime   string   `json:"bestTravelTime"`
			AvgStayDays      string   `json:"avgStayDays"`
			Climate          string   `json:"climate"`
			TravelNotesCount int      `json:"travelNotesCount"`
			PoisCount        int      `json:"poisCount"`
			QuestionsCount   int      `json:"questionsCount"`
		}
		if err := json.Unmarshal(data, &d); err != nil {
			return err
		}
		imagesJSON, _ := json.Marshal(d.ImageURLs)
		_, err = h.DB.ExecContext(ctx, `
			INSERT INTO mafengwo_destinations (mdd_id, source_url, name, name_en, description,
				cover_image_url, image_urls, best_travel_time, avg_stay_days, climate,
				travel_notes_count, pois_count, questions_count, crawled_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			ON DUPLICATE KEY UPDATE
				name=VALUES(name), description=VALUES(description),
				cover_image_url=VALUES(cover_image_url), image_urls=VALUES(image_urls),
				travel_notes_count=VALUES(travel_notes_count), pois_count=VALUES(pois_count),
				questions_count=VALUES(questions_count), updated_at=?`,
			d.MddID, d.SourceURL, d.Name, d.NameEn, d.Description,
			d.CoverImageURL, string(imagesJSON), d.BestTravelTime, d.AvgStayDays, d.Climate,
			d.TravelNotesCount, d.PoisCount, d.QuestionsCount, now, now,
		)
		savedID = d.MddID

	case "poi":
		var d struct {
			PoiID           string   `json:"poiId"`
			SourceURL       string   `json:"sourceUrl"`
			Name            string   `json:"name"`
			Category        string   `json:"category"`
			DestinationID   string   `json:"destinationId"`
			DestinationName string   `json:"destinationName"`
			Address         string   `json:"address"`
			Latitude        float64  `json:"latitude"`
			Longitude       float64  `json:"longitude"`
			Rating          float64  `json:"rating"`
			Description     string   `json:"description"`
			Tips            []string `json:"tips"`
			Highlights      []string `json:"highlights"`
			CoverImageURL   string   `json:"coverImageUrl"`
			ImageURLs       []string `json:"imageUrls"`
			ReviewsCount    int      `json:"reviewsCount"`
			SavesCount      int      `json:"savesCount"`
			Tags            []string `json:"tags"`
		}
		if err := json.Unmarshal(data, &d); err != nil {
			return err
		}
		tipsJSON, _ := json.Marshal(d.Tips)
		highlightsJSON, _ := json.Marshal(d.Highlights)
		imagesJSON, _ := json.Marshal(d.ImageURLs)
		tagsJSON, _ := json.Marshal(d.Tags)
		_, err = h.DB.ExecContext(ctx, `
			INSERT INTO mafengwo_pois (poi_id, source_url, name, category, destination_id, destination_name,
				address, latitude, longitude, rating, description, tips, highlights,
				cover_image_url, image_urls, reviews_count, saves_count, tags, crawled_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			ON DUPLICATE KEY UPDATE
				name=VALUES(name), description=VALUES(description), rating=VALUES(rating),
				cover_image_url=VALUES(cover_image_url), image_urls=VALUES(image_urls),
				reviews_count=VALUES(reviews_count), saves_count=VALUES(saves_count), updated_at=?`,
			d.PoiID, d.SourceURL, d.Name, d.Category, d.DestinationID, d.DestinationName,
			d.Address, d.Latitude, d.Longitude, d.Rating, d.Description,
			string(tipsJSON), string(highlightsJSON), d.CoverImageURL, string(imagesJSON),
			d.ReviewsCount, d.SavesCount, string(tagsJSON), now, now,
		)
		savedID = d.PoiID

	case "guide":
		var d struct {
			GuideID         string `json:"guideId"`
			SourceURL       string `json:"sourceUrl"`
			Title           string `json:"title"`
			DestinationID   string `json:"destinationId"`
			DestinationName string `json:"destinationName"`
			AuthorName      string `json:"authorName"`
			AuthorID        string `json:"authorId"`
			Summary         string `json:"summary"`
			Content         string `json:"content"`
			ContentHTML     string `json:"contentHtml"`
			ViewsCount      int    `json:"viewsCount"`
			LikesCount      int    `json:"likesCount"`
			SavesCount      int    `json:"savesCount"`
			CommentsCount   int    `json:"commentsCount"`
		}
		if err := json.Unmarshal(data, &d); err != nil {
			return err
		}
		_, err = h.DB.ExecContext(ctx, `
			INSERT INTO mafengwo_guides (guide_id, source_url, title, destination_id, destination_name,
				author_name, author_id, summary, content, content_html,
				views_count, likes_count, saves_count, comments_count, crawled_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			ON DUPLICATE KEY UPDATE
				title=VALUES(title), content=VALUES(content), views_count=VALUES(views_count),
				likes_count=VALUES(likes_count), saves_count=VALUES(saves_count), updated_at=?`,
			d.GuideID, d.SourceURL, d.Title, d.DestinationID, d.DestinationName,
			d.AuthorName, d.AuthorID, d.Summary, d.Content, d.ContentHTML,
			d.ViewsCount, d.LikesCount, d.SavesCount, d.CommentsCount, now, now,
		)
		savedID = d.GuideID

	case "qa":
		var d struct {
			QuestionID      string `json:"questionId"`
			SourceURL       string `json:"sourceUrl"`
			Title           string `json:"title"`
			Content         string `json:"content"`
			DestinationID   string `json:"destinationId"`
			DestinationName string `json:"destinationName"`
			AuthorName      string `json:"authorName"`
			AnswersCount    int    `json:"answersCount"`
			ViewsCount      int    `json:"viewsCount"`
		}
		if err := json.Unmarshal(data, &d); err != nil {
			return err
		}
		_, err = h.DB.ExecContext(ctx, `
			INSERT INTO mafengwo_qa (question_id, source_url, title, content,
				destination_id, destination_name, author_name, answers_count, views_count, crawled_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			ON DUPLICATE KEY UPDATE
				title=VALUES(title), content=VALUES(content),
				answers_count=VALUES(answers_count), views_count=VALUES(views_count)`,
			d.QuestionID, d.SourceURL, d.Title, d.Content,
			d.DestinationID, d.DestinationName, d.AuthorName, d.AnswersCount, d.ViewsCount, now,
		)
		savedID = d.QuestionID

	case "ranking":
		var d struct {
			RankingID       string          `json:"rankingId"`
			SourceURL       string          `json:"sourceUrl"`
			RankingType     string          `json:"rankingType"`
			Title           string          `json:"title"`
			DestinationID   string          `json:"destinationId"`
			DestinationName string          `json:"destinationName"`
			Description     string          `json:"description"`
			Items           json.RawMessage `json:"items"`
		}
		if err := json.Unmarshal(data, &d); err != nil {
			return err
		}
		_, err = h.DB.ExecContext(ctx, `
			INSERT INTO mafengwo_rankings (ranking_id, source_url, ranking_type, title,
				destination_id, destination_name, description, items, crawled_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
			ON DUPLICATE KEY UPDATE
				title=VALUES(title), description=VALUES(description),
				items=VALUES(items), updated_at=?`,
			d.RankingID, d.SourceURL, d.RankingType, d.Title,
			d.DestinationID, d.DestinationName, d.Description, string(d.Items), now, now,
		)
		savedID = d.RankingID
	}

	if err != nil {
		slog.Error("Failed to save mafengwo data", "dataType", dataType, "error", err)
		h.EventBus.Publish(ctx, eventbus.Event{
			Topic: "crawler.mafengwo.data.saved",
			Data:  map[string]any{"dataType": dataType, "success": false, "error": err.Error()},
		})
		return err
	}

	slog.Info("Saved mafengwo data", "dataType", dataType, "savedId", savedID)
	h.EventBus.Publish(ctx, eventbus.Event{
		Topic: "crawler.mafengwo.data.saved",
		Data:  map[string]any{"dataType": dataType, "savedId": savedID, "success": true},
	})
	return nil
}

func (h *Handler) handleNotification(ctx context.Context, event eventbus.Event) error {
	slog.Info("Notification received (stub)", "data", event.Data)
	h.EventBus.Publish(ctx, eventbus.Event{
		Topic: "notification.sent",
		Data:  event.Data,
	})
	return nil
}
