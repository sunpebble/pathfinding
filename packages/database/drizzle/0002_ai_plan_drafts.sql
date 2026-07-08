CREATE TABLE `ai_plan_drafts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` text NOT NULL,
	`user_id` integer NOT NULL,
	`draft` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ai_plan_drafts_session_user_uniq` ON `ai_plan_drafts` (`session_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `ai_plan_drafts_user_idx` ON `ai_plan_drafts` (`user_id`);