-- 0001_updated_at_triggers.sql
-- SQLite 无 ON UPDATE NOW()，用 AFTER UPDATE 触发器等价实现 MySQL 的 updated_at 自动刷新。
-- updated_at 列存秒级 unix 时间戳（drizzle integer mode 'timestamp' + DEFAULT (unixepoch())），
-- 故触发器体用 unixepoch() 保持单位一致。
--
-- WHERE updated_at = OLD.updated_at：仅在业务 UPDATE 未显式改 updated_at 时刷新，
-- 避免覆盖应用层显式设定的 updated_at 值。
--
-- 表清单来自 0000_*.sql 中所有含 `updated_at` 列的表（共 12 张）。
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

CREATE TRIGGER IF NOT EXISTS shared_expenses_updated_at
AFTER UPDATE ON shared_expenses
BEGIN
  UPDATE shared_expenses SET updated_at = (unixepoch())
  WHERE id = NEW.id AND updated_at = OLD.updated_at;
END;

CREATE TRIGGER IF NOT EXISTS expenses_updated_at
AFTER UPDATE ON expenses
BEGIN
  UPDATE expenses SET updated_at = (unixepoch())
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
