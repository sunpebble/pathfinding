-- 0001_updated_at_triggers.sql
-- SQLite 无 ON UPDATE NOW()，用 AFTER UPDATE 触发器等价实现 MySQL 的 updated_at 自动刷新。
-- updated_at 列存秒级 unix 时间戳（drizzle integer mode 'timestamp' + DEFAULT (unixepoch())），
-- 故触发器体用 unixepoch() 保持单位一致。
--
-- WHERE updated_at = OLD.updated_at：仅在业务 UPDATE 未显式改 updated_at 时刷新，
-- 避免覆盖应用层显式设定的 updated_at 值。
--
-- 表清单来自 0000_*.sql 中所有含 `updated_at` 列的表（共 31 张）。
-- 该文件按 drizzle 迁移序命名，由 wrangler d1 migrations apply 在 0000 建表之后执行。

CREATE TRIGGER IF NOT EXISTS users_updated_at
AFTER UPDATE ON users
BEGIN
  UPDATE users SET updated_at = (unixepoch())
  WHERE id = NEW.id AND updated_at = OLD.updated_at;
END;

CREATE TRIGGER IF NOT EXISTS chat_sessions_updated_at
AFTER UPDATE ON chat_sessions
BEGIN
  UPDATE chat_sessions SET updated_at = (unixepoch())
  WHERE id = NEW.id AND updated_at = OLD.updated_at;
END;

CREATE TRIGGER IF NOT EXISTS cities_updated_at
AFTER UPDATE ON cities
BEGIN
  UPDATE cities SET updated_at = (unixepoch())
  WHERE id = NEW.id AND updated_at = OLD.updated_at;
END;

CREATE TRIGGER IF NOT EXISTS crawl_jobs_updated_at
AFTER UPDATE ON crawl_jobs
BEGIN
  UPDATE crawl_jobs SET updated_at = (unixepoch())
  WHERE id = NEW.id AND updated_at = OLD.updated_at;
END;

CREATE TRIGGER IF NOT EXISTS raw_crawl_records_updated_at
AFTER UPDATE ON raw_crawl_records
BEGIN
  UPDATE raw_crawl_records SET updated_at = (unixepoch())
  WHERE id = NEW.id AND updated_at = OLD.updated_at;
END;

CREATE TRIGGER IF NOT EXISTS training_datasets_updated_at
AFTER UPDATE ON training_datasets
BEGIN
  UPDATE training_datasets SET updated_at = (unixepoch())
  WHERE id = NEW.id AND updated_at = OLD.updated_at;
END;

CREATE TRIGGER IF NOT EXISTS shared_expenses_updated_at
AFTER UPDATE ON shared_expenses
BEGIN
  UPDATE shared_expenses SET updated_at = (unixepoch())
  WHERE id = NEW.id AND updated_at = OLD.updated_at;
END;

CREATE TRIGGER IF NOT EXISTS guide_comments_updated_at
AFTER UPDATE ON guide_comments
BEGIN
  UPDATE guide_comments SET updated_at = (unixepoch())
  WHERE id = NEW.id AND updated_at = OLD.updated_at;
END;

CREATE TRIGGER IF NOT EXISTS refetch_tasks_updated_at
AFTER UPDATE ON refetch_tasks
BEGIN
  UPDATE refetch_tasks SET updated_at = (unixepoch())
  WHERE id = NEW.id AND updated_at = OLD.updated_at;
END;

CREATE TRIGGER IF NOT EXISTS travel_guides_updated_at
AFTER UPDATE ON travel_guides
BEGIN
  UPDATE travel_guides SET updated_at = (unixepoch())
  WHERE id = NEW.id AND updated_at = OLD.updated_at;
END;

CREATE TRIGGER IF NOT EXISTS expenses_updated_at
AFTER UPDATE ON expenses
BEGIN
  UPDATE expenses SET updated_at = (unixepoch())
  WHERE id = NEW.id AND updated_at = OLD.updated_at;
END;

CREATE TRIGGER IF NOT EXISTS favorite_collections_updated_at
AFTER UPDATE ON favorite_collections
BEGIN
  UPDATE favorite_collections SET updated_at = (unixepoch())
  WHERE id = NEW.id AND updated_at = OLD.updated_at;
END;

CREATE TRIGGER IF NOT EXISTS itineraries_updated_at
AFTER UPDATE ON itineraries
BEGIN
  UPDATE itineraries SET updated_at = (unixepoch())
  WHERE id = NEW.id AND updated_at = OLD.updated_at;
END;

CREATE TRIGGER IF NOT EXISTS itinerary_budgets_updated_at
AFTER UPDATE ON itinerary_budgets
BEGIN
  UPDATE itinerary_budgets SET updated_at = (unixepoch())
  WHERE id = NEW.id AND updated_at = OLD.updated_at;
END;

CREATE TRIGGER IF NOT EXISTS itinerary_collaborators_updated_at
AFTER UPDATE ON itinerary_collaborators
BEGIN
  UPDATE itinerary_collaborators SET updated_at = (unixepoch())
  WHERE id = NEW.id AND updated_at = OLD.updated_at;
END;

CREATE TRIGGER IF NOT EXISTS itinerary_days_updated_at
AFTER UPDATE ON itinerary_days
BEGIN
  UPDATE itinerary_days SET updated_at = (unixepoch())
  WHERE id = NEW.id AND updated_at = OLD.updated_at;
END;

CREATE TRIGGER IF NOT EXISTS itinerary_items_updated_at
AFTER UPDATE ON itinerary_items
BEGIN
  UPDATE itinerary_items SET updated_at = (unixepoch())
  WHERE id = NEW.id AND updated_at = OLD.updated_at;
END;

CREATE TRIGGER IF NOT EXISTS mafengwo_destinations_updated_at
AFTER UPDATE ON mafengwo_destinations
BEGIN
  UPDATE mafengwo_destinations SET updated_at = (unixepoch())
  WHERE id = NEW.id AND updated_at = OLD.updated_at;
END;

CREATE TRIGGER IF NOT EXISTS mafengwo_guides_updated_at
AFTER UPDATE ON mafengwo_guides
BEGIN
  UPDATE mafengwo_guides SET updated_at = (unixepoch())
  WHERE id = NEW.id AND updated_at = OLD.updated_at;
END;

CREATE TRIGGER IF NOT EXISTS mafengwo_pois_updated_at
AFTER UPDATE ON mafengwo_pois
BEGIN
  UPDATE mafengwo_pois SET updated_at = (unixepoch())
  WHERE id = NEW.id AND updated_at = OLD.updated_at;
END;

CREATE TRIGGER IF NOT EXISTS mafengwo_rankings_updated_at
AFTER UPDATE ON mafengwo_rankings
BEGIN
  UPDATE mafengwo_rankings SET updated_at = (unixepoch())
  WHERE id = NEW.id AND updated_at = OLD.updated_at;
END;

CREATE TRIGGER IF NOT EXISTS notification_settings_updated_at
AFTER UPDATE ON notification_settings
BEGIN
  UPDATE notification_settings SET updated_at = (unixepoch())
  WHERE id = NEW.id AND updated_at = OLD.updated_at;
END;

CREATE TRIGGER IF NOT EXISTS push_tokens_updated_at
AFTER UPDATE ON push_tokens
BEGIN
  UPDATE push_tokens SET updated_at = (unixepoch())
  WHERE id = NEW.id AND updated_at = OLD.updated_at;
END;

CREATE TRIGGER IF NOT EXISTS poi_answers_updated_at
AFTER UPDATE ON poi_answers
BEGIN
  UPDATE poi_answers SET updated_at = (unixepoch())
  WHERE id = NEW.id AND updated_at = OLD.updated_at;
END;

CREATE TRIGGER IF NOT EXISTS poi_questions_updated_at
AFTER UPDATE ON poi_questions
BEGIN
  UPDATE poi_questions SET updated_at = (unixepoch())
  WHERE id = NEW.id AND updated_at = OLD.updated_at;
END;

CREATE TRIGGER IF NOT EXISTS pois_updated_at
AFTER UPDATE ON pois
BEGIN
  UPDATE pois SET updated_at = (unixepoch())
  WHERE id = NEW.id AND updated_at = OLD.updated_at;
END;

CREATE TRIGGER IF NOT EXISTS profiles_updated_at
AFTER UPDATE ON profiles
BEGIN
  UPDATE profiles SET updated_at = (unixepoch())
  WHERE id = NEW.id AND updated_at = OLD.updated_at;
END;

CREATE TRIGGER IF NOT EXISTS content_translations_updated_at
AFTER UPDATE ON content_translations
BEGIN
  UPDATE content_translations SET updated_at = (unixepoch())
  WHERE id = NEW.id AND updated_at = OLD.updated_at;
END;

CREATE TRIGGER IF NOT EXISTS offline_translation_packs_updated_at
AFTER UPDATE ON offline_translation_packs
BEGIN
  UPDATE offline_translation_packs SET updated_at = (unixepoch())
  WHERE id = NEW.id AND updated_at = OLD.updated_at;
END;

CREATE TRIGGER IF NOT EXISTS saved_translations_updated_at
AFTER UPDATE ON saved_translations
BEGIN
  UPDATE saved_translations SET updated_at = (unixepoch())
  WHERE id = NEW.id AND updated_at = OLD.updated_at;
END;

CREATE TRIGGER IF NOT EXISTS travel_notes_updated_at
AFTER UPDATE ON travel_notes
BEGIN
  UPDATE travel_notes SET updated_at = (unixepoch())
  WHERE id = NEW.id AND updated_at = OLD.updated_at;
END;
