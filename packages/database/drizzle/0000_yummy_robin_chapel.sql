CREATE TABLE `auth_accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`provider` text NOT NULL,
	`provider_account_id` text NOT NULL,
	`secret` text,
	`email_verified` text,
	`phone_verified` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `auth_accounts_user_idx` ON `auth_accounts` (`user_id`);--> statement-breakpoint
CREATE INDEX `auth_accounts_provider_idx` ON `auth_accounts` (`provider`,`provider_account_id`);--> statement-breakpoint
CREATE TABLE `auth_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`expiration_time` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `auth_sessions_user_idx` ON `auth_sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `rate_limits_key_idx` ON `rate_limits` (`key`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text,
	`email` text,
	`email_verification_time` integer,
	`phone` text,
	`phone_verification_time` integer,
	`image` text,
	`is_anonymous` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_uniq` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_phone_idx` ON `users` (`phone`);--> statement-breakpoint
CREATE TABLE `chat_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` integer NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`metadata` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `chat_messages_session_idx` ON `chat_messages` (`session_id`);--> statement-breakpoint
CREATE INDEX `chat_messages_session_created_idx` ON `chat_messages` (`session_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `chat_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`title` text,
	`is_archived` integer DEFAULT false NOT NULL,
	`last_message_at` integer,
	`itinerary_id` integer,
	`metadata` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `chat_sessions_user_idx` ON `chat_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `chat_sessions_user_archived_idx` ON `chat_sessions` (`user_id`,`is_archived`);--> statement-breakpoint
CREATE INDEX `chat_sessions_user_last_msg_idx` ON `chat_sessions` (`user_id`,`last_message_at`);--> statement-breakpoint
CREATE INDEX `chat_sessions_itinerary_idx` ON `chat_sessions` (`itinerary_id`);--> statement-breakpoint
CREATE TABLE `cities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`name_en` text,
	`timezone` text,
	`country_code` text,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`utc_offset` real,
	`utc_offset_dst` real,
	`has_dst` integer DEFAULT false,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `cities_name_idx` ON `cities` (`name`);--> statement-breakpoint
CREATE INDEX `cities_country_idx` ON `cities` (`country_code`);--> statement-breakpoint
CREATE INDEX `cities_timezone_idx` ON `cities` (`timezone`);--> statement-breakpoint
CREATE TABLE `crawl_jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`platform` text NOT NULL,
	`job_type` text,
	`config` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`progress` text,
	`started_at` integer,
	`completed_at` integer,
	`error` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `crawl_jobs_status_idx` ON `crawl_jobs` (`status`);--> statement-breakpoint
CREATE INDEX `crawl_jobs_platform_idx` ON `crawl_jobs` (`platform`);--> statement-breakpoint
CREATE TABLE `data_quality_reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`dataset_id` integer NOT NULL,
	`report_type` text,
	`metrics` text,
	`issues` text,
	`generated_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `quality_reports_dataset_idx` ON `data_quality_reports` (`dataset_id`);--> statement-breakpoint
CREATE TABLE `raw_crawl_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`job_id` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`url` text,
	`raw_data` text,
	`processed_data` text,
	`content_hash` text,
	`parse_status` text DEFAULT 'pending' NOT NULL,
	`error` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `raw_crawl_job_idx` ON `raw_crawl_records` (`job_id`);--> statement-breakpoint
CREATE INDEX `raw_crawl_job_status_idx` ON `raw_crawl_records` (`job_id`,`status`);--> statement-breakpoint
CREATE INDEX `raw_crawl_status_idx` ON `raw_crawl_records` (`status`);--> statement-breakpoint
CREATE INDEX `raw_crawl_content_hash_idx` ON `raw_crawl_records` (`content_hash`);--> statement-breakpoint
CREATE INDEX `raw_crawl_parse_status_idx` ON `raw_crawl_records` (`parse_status`);--> statement-breakpoint
CREATE TABLE `training_datasets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`description` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`record_count` integer DEFAULT 0 NOT NULL,
	`config` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `datasets_name_idx` ON `training_datasets` (`name`);--> statement-breakpoint
CREATE INDEX `datasets_version_idx` ON `training_datasets` (`version`);--> statement-breakpoint
CREATE INDEX `datasets_status_idx` ON `training_datasets` (`status`);--> statement-breakpoint
CREATE TABLE `travel_blog_posts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`platform` text NOT NULL,
	`external_id` text,
	`title` text,
	`url` text,
	`content` text,
	`author_name` text,
	`crawled_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `blog_posts_platform_idx` ON `travel_blog_posts` (`platform`);--> statement-breakpoint
CREATE INDEX `blog_posts_platform_ext_idx` ON `travel_blog_posts` (`platform`,`external_id`);--> statement-breakpoint
CREATE TABLE `currency_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`base_currency` text NOT NULL,
	`target_currency` text NOT NULL,
	`rate` real NOT NULL,
	`days` integer DEFAULT 1 NOT NULL,
	`fetched_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `currency_hist_pair_idx` ON `currency_history` (`base_currency`,`target_currency`);--> statement-breakpoint
CREATE INDEX `currency_hist_pair_days_idx` ON `currency_history` (`base_currency`,`target_currency`,`days`);--> statement-breakpoint
CREATE INDEX `currency_hist_fetched_idx` ON `currency_history` (`fetched_at`);--> statement-breakpoint
CREATE TABLE `currency_rates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`base_currency` text NOT NULL,
	`rates` text NOT NULL,
	`fetched_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `currency_rates_base_idx` ON `currency_rates` (`base_currency`);--> statement-breakpoint
CREATE INDEX `currency_rates_fetched_idx` ON `currency_rates` (`fetched_at`);--> statement-breakpoint
CREATE TABLE `expense_participants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`expense_id` integer NOT NULL,
	`member_id` integer NOT NULL,
	`share_amount` real NOT NULL,
	`is_paid` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `exp_participants_expense_idx` ON `expense_participants` (`expense_id`);--> statement-breakpoint
CREATE INDEX `exp_participants_member_idx` ON `expense_participants` (`member_id`);--> statement-breakpoint
CREATE INDEX `exp_participants_pair_idx` ON `expense_participants` (`expense_id`,`member_id`);--> statement-breakpoint
CREATE TABLE `settlements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`itinerary_id` integer NOT NULL,
	`from_member_id` integer NOT NULL,
	`to_member_id` integer NOT NULL,
	`amount` real NOT NULL,
	`currency` text DEFAULT 'CNY' NOT NULL,
	`is_settled` integer DEFAULT false NOT NULL,
	`settled_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `settlements_itin_idx` ON `settlements` (`itinerary_id`);--> statement-breakpoint
CREATE INDEX `settlements_from_idx` ON `settlements` (`from_member_id`);--> statement-breakpoint
CREATE INDEX `settlements_to_idx` ON `settlements` (`to_member_id`);--> statement-breakpoint
CREATE INDEX `settlements_settled_idx` ON `settlements` (`is_settled`);--> statement-breakpoint
CREATE TABLE `shared_expenses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`itinerary_id` integer NOT NULL,
	`paid_by_member_id` integer NOT NULL,
	`amount` real NOT NULL,
	`currency` text DEFAULT 'CNY' NOT NULL,
	`category` text,
	`description` text,
	`date` text,
	`split_type` text DEFAULT 'equal' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `shared_exp_itin_idx` ON `shared_expenses` (`itinerary_id`);--> statement-breakpoint
CREATE INDEX `shared_exp_itin_date_idx` ON `shared_expenses` (`itinerary_id`,`date`);--> statement-breakpoint
CREATE INDEX `shared_exp_paid_by_idx` ON `shared_expenses` (`paid_by_member_id`);--> statement-breakpoint
CREATE INDEX `shared_exp_category_idx` ON `shared_expenses` (`category`);--> statement-breakpoint
CREATE TABLE `trip_members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`itinerary_id` integer NOT NULL,
	`user_id` integer,
	`name` text NOT NULL,
	`avatar_url` text,
	`is_registered` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `trip_members_itin_idx` ON `trip_members` (`itinerary_id`);--> statement-breakpoint
CREATE INDEX `trip_members_itin_user_idx` ON `trip_members` (`itinerary_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `trip_members_user_idx` ON `trip_members` (`user_id`);--> statement-breakpoint
CREATE TABLE `guide_comment_likes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`comment_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `guide_clikes_comment_idx` ON `guide_comment_likes` (`comment_id`);--> statement-breakpoint
CREATE INDEX `guide_clikes_user_idx` ON `guide_comment_likes` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `guide_clikes_uniq` ON `guide_comment_likes` (`comment_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `guide_comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guide_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`parent_id` integer,
	`content` text NOT NULL,
	`likes_count` integer DEFAULT 0 NOT NULL,
	`replies_count` integer DEFAULT 0 NOT NULL,
	`is_edited` integer DEFAULT false NOT NULL,
	`is_deleted` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `guide_comments_guide_idx` ON `guide_comments` (`guide_id`);--> statement-breakpoint
CREATE INDEX `guide_comments_user_idx` ON `guide_comments` (`user_id`);--> statement-breakpoint
CREATE INDEX `guide_comments_parent_idx` ON `guide_comments` (`parent_id`);--> statement-breakpoint
CREATE INDEX `guide_comments_guide_created_idx` ON `guide_comments` (`guide_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `guide_destinations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guide_id` integer NOT NULL,
	`destination` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `guide_dest_destination_idx` ON `guide_destinations` (`destination`);--> statement-breakpoint
CREATE INDEX `guide_dest_guide_idx` ON `guide_destinations` (`guide_id`);--> statement-breakpoint
CREATE INDEX `guide_dest_dest_guide_idx` ON `guide_destinations` (`destination`,`guide_id`);--> statement-breakpoint
CREATE TABLE `guide_recommendations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`guide_id` integer NOT NULL,
	`score` real NOT NULL,
	`reason` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `guide_recs_user_idx` ON `guide_recommendations` (`user_id`);--> statement-breakpoint
CREATE INDEX `guide_recs_user_guide_idx` ON `guide_recommendations` (`user_id`,`guide_id`);--> statement-breakpoint
CREATE INDEX `guide_recs_score_idx` ON `guide_recommendations` (`score`);--> statement-breakpoint
CREATE TABLE `refetch_tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guide_id` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`reason` text,
	`retry_count` integer DEFAULT 0 NOT NULL,
	`next_retry_at` integer,
	`last_error` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `refetch_tasks_status_idx` ON `refetch_tasks` (`status`);--> statement-breakpoint
CREATE INDEX `refetch_tasks_guide_idx` ON `refetch_tasks` (`guide_id`);--> statement-breakpoint
CREATE INDEX `refetch_tasks_retry_idx` ON `refetch_tasks` (`next_retry_at`);--> statement-breakpoint
CREATE TABLE `travel_guide_ai_data` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guide_id` integer NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`ai_summary` text,
	`ai_tags` text,
	`ai_categories` text,
	`ai_quality_notes` text,
	`processed_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `guide_ai_guide_idx` ON `travel_guide_ai_data` (`guide_id`);--> statement-breakpoint
CREATE INDEX `guide_ai_guide_ver_idx` ON `travel_guide_ai_data` (`guide_id`,`version`);--> statement-breakpoint
CREATE TABLE `travel_guides` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`platform` text NOT NULL,
	`external_id` text,
	`title` text NOT NULL,
	`content` text,
	`author_name` text,
	`author_url` text,
	`published_at` integer,
	`source_url` text,
	`cover_image_url` text,
	`image_urls` text,
	`destinations` text,
	`tags` text,
	`category` text,
	`view_count` integer DEFAULT 0 NOT NULL,
	`like_count` integer DEFAULT 0 NOT NULL,
	`comment_count` integer DEFAULT 0 NOT NULL,
	`quality_score` real,
	`completeness_score` real,
	`completeness_level` text,
	`enriched_data` text,
	`geo_data` text,
	`day_itineraries` text,
	`crawled_at` integer,
	`last_updated_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `travel_guides_platform_idx` ON `travel_guides` (`platform`);--> statement-breakpoint
CREATE UNIQUE INDEX `travel_guides_platform_ext_idx` ON `travel_guides` (`platform`,`external_id`);--> statement-breakpoint
CREATE INDEX `travel_guides_quality_idx` ON `travel_guides` (`quality_score`);--> statement-breakpoint
CREATE INDEX `travel_guides_completeness_idx` ON `travel_guides` (`completeness_score`);--> statement-breakpoint
CREATE TABLE `comment_reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`comment_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`reason` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`reviewed_at` integer,
	`reviewed_by` integer
);
--> statement-breakpoint
CREATE INDEX `comment_reports_comment_idx` ON `comment_reports` (`comment_id`);--> statement-breakpoint
CREATE INDEX `comment_reports_user_idx` ON `comment_reports` (`user_id`);--> statement-breakpoint
CREATE INDEX `comment_reports_status_idx` ON `comment_reports` (`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `comment_reports_uniq` ON `comment_reports` (`comment_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`itinerary_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`category_id` integer,
	`amount` real NOT NULL,
	`currency` text DEFAULT 'CNY' NOT NULL,
	`description` text,
	`date` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `expenses_itinerary_idx` ON `expenses` (`itinerary_id`);--> statement-breakpoint
CREATE INDEX `expenses_user_idx` ON `expenses` (`user_id`);--> statement-breakpoint
CREATE INDEX `expenses_category_idx` ON `expenses` (`category_id`);--> statement-breakpoint
CREATE INDEX `expenses_itin_category_idx` ON `expenses` (`itinerary_id`,`category_id`);--> statement-breakpoint
CREATE INDEX `expenses_date_idx` ON `expenses` (`date`);--> statement-breakpoint
CREATE TABLE `favorite_collections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`cover_image_url` text,
	`is_default` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `fav_collections_user_idx` ON `favorite_collections` (`user_id`);--> statement-breakpoint
CREATE INDEX `fav_collections_user_default_idx` ON `favorite_collections` (`user_id`,`is_default`);--> statement-breakpoint
CREATE INDEX `fav_collections_user_sort_idx` ON `favorite_collections` (`user_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `itineraries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`title` text NOT NULL,
	`city_id` integer NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`visibility` text DEFAULT 'private' NOT NULL,
	`cover_image_url` text,
	`copied_from_id` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `itineraries_user_idx` ON `itineraries` (`user_id`);--> statement-breakpoint
CREATE INDEX `itineraries_visibility_idx` ON `itineraries` (`visibility`);--> statement-breakpoint
CREATE INDEX `itineraries_city_idx` ON `itineraries` (`city_id`);--> statement-breakpoint
CREATE INDEX `itineraries_visibility_city_idx` ON `itineraries` (`visibility`,`city_id`);--> statement-breakpoint
CREATE INDEX `itineraries_user_visibility_idx` ON `itineraries` (`user_id`,`visibility`);--> statement-breakpoint
CREATE TABLE `itinerary_budgets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`itinerary_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`total_budget` real,
	`currency` text DEFAULT 'CNY' NOT NULL,
	`category_budgets` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `itin_budgets_itinerary_idx` ON `itinerary_budgets` (`itinerary_id`);--> statement-breakpoint
CREATE INDEX `itin_budgets_user_idx` ON `itinerary_budgets` (`user_id`);--> statement-breakpoint
CREATE TABLE `itinerary_collaborators` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`itinerary_id` integer NOT NULL,
	`role` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `itinerary_collabs_itinerary_idx` ON `itinerary_collaborators` (`itinerary_id`);--> statement-breakpoint
CREATE INDEX `itinerary_collabs_user_idx` ON `itinerary_collaborators` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `itinerary_collabs_uniq` ON `itinerary_collaborators` (`itinerary_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `itinerary_days` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`itinerary_id` integer NOT NULL,
	`day_number` integer NOT NULL,
	`date` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `itinerary_days_itinerary_idx` ON `itinerary_days` (`itinerary_id`);--> statement-breakpoint
CREATE TABLE `itinerary_favorites` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`itinerary_id` integer NOT NULL,
	`collection_id` integer,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `itin_favs_user_idx` ON `itinerary_favorites` (`user_id`);--> statement-breakpoint
CREATE INDEX `itin_favs_itinerary_idx` ON `itinerary_favorites` (`itinerary_id`);--> statement-breakpoint
CREATE INDEX `itin_favs_collection_idx` ON `itinerary_favorites` (`collection_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `itin_favs_uniq` ON `itinerary_favorites` (`user_id`,`itinerary_id`);--> statement-breakpoint
CREATE INDEX `itin_favs_user_collection_idx` ON `itinerary_favorites` (`user_id`,`collection_id`);--> statement-breakpoint
CREATE TABLE `itinerary_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`day_id` integer NOT NULL,
	`poi_id` integer NOT NULL,
	`order_index` integer NOT NULL,
	`start_time` text,
	`end_time` text,
	`transport_mode` text NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `itinerary_items_day_idx` ON `itinerary_items` (`day_id`);--> statement-breakpoint
CREATE TABLE `itinerary_likes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`itinerary_id` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `itin_likes_user_idx` ON `itinerary_likes` (`user_id`);--> statement-breakpoint
CREATE INDEX `itin_likes_itinerary_idx` ON `itinerary_likes` (`itinerary_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `itin_likes_uniq` ON `itinerary_likes` (`user_id`,`itinerary_id`);--> statement-breakpoint
CREATE TABLE `mafengwo_destinations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`mdd_id` text NOT NULL,
	`source_url` text NOT NULL,
	`name` text NOT NULL,
	`name_en` text,
	`country` text,
	`province` text,
	`description` text,
	`cover_image_url` text,
	`image_urls` text NOT NULL,
	`latitude` real,
	`longitude` real,
	`timezone` text,
	`best_travel_time` text,
	`avg_stay_days` text,
	`climate` text,
	`language` text,
	`currency` text,
	`visa` text,
	`travel_notes_count` integer DEFAULT 0 NOT NULL,
	`pois_count` integer DEFAULT 0 NOT NULL,
	`questions_count` integer DEFAULT 0 NOT NULL,
	`guides_count` integer,
	`crawled_at` integer NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mafengwo_dest_mdd_id_idx` ON `mafengwo_destinations` (`mdd_id`);--> statement-breakpoint
CREATE INDEX `mafengwo_dest_name_idx` ON `mafengwo_destinations` (`name`);--> statement-breakpoint
CREATE INDEX `mafengwo_dest_country_idx` ON `mafengwo_destinations` (`country`);--> statement-breakpoint
CREATE TABLE `mafengwo_guides` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guide_id` text NOT NULL,
	`source_url` text NOT NULL,
	`title` text NOT NULL,
	`destination_id` text,
	`destination_name` text,
	`author_name` text,
	`author_id` text,
	`summary` text,
	`content` text NOT NULL,
	`content_html` text,
	`sections` text NOT NULL,
	`cover_image_url` text,
	`image_urls` text NOT NULL,
	`views_count` integer DEFAULT 0 NOT NULL,
	`likes_count` integer DEFAULT 0 NOT NULL,
	`saves_count` integer DEFAULT 0 NOT NULL,
	`comments_count` integer DEFAULT 0 NOT NULL,
	`tags` text NOT NULL,
	`published_at` integer,
	`quality_score` integer DEFAULT 0 NOT NULL,
	`crawled_at` integer NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mafengwo_guides_guide_id_idx` ON `mafengwo_guides` (`guide_id`);--> statement-breakpoint
CREATE INDEX `mafengwo_guides_destination_idx` ON `mafengwo_guides` (`destination_id`);--> statement-breakpoint
CREATE INDEX `mafengwo_guides_quality_idx` ON `mafengwo_guides` (`quality_score`);--> statement-breakpoint
CREATE INDEX `mafengwo_guides_views_idx` ON `mafengwo_guides` (`views_count`);--> statement-breakpoint
CREATE TABLE `mafengwo_pois` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`poi_id` text NOT NULL,
	`source_url` text NOT NULL,
	`name` text NOT NULL,
	`name_en` text,
	`category` text NOT NULL,
	`destination_id` text,
	`destination_name` text,
	`address` text,
	`latitude` real,
	`longitude` real,
	`rating` real,
	`rating_count` integer DEFAULT 0 NOT NULL,
	`price_level` integer,
	`price_range` text,
	`ticket_price` text,
	`opening_hours` text,
	`phone` text,
	`website` text,
	`description` text,
	`tips` text NOT NULL,
	`highlights` text NOT NULL,
	`cover_image_url` text,
	`image_urls` text NOT NULL,
	`reviews_count` integer DEFAULT 0 NOT NULL,
	`saves_count` integer DEFAULT 0 NOT NULL,
	`tags` text NOT NULL,
	`cuisine_type` text,
	`signature_dishes` text NOT NULL,
	`star_rating` integer,
	`amenities` text NOT NULL,
	`check_in_time` text,
	`check_out_time` text,
	`quality_score` integer DEFAULT 0 NOT NULL,
	`crawled_at` integer NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mafengwo_pois_poi_id_idx` ON `mafengwo_pois` (`poi_id`);--> statement-breakpoint
CREATE INDEX `mafengwo_pois_name_idx` ON `mafengwo_pois` (`name`);--> statement-breakpoint
CREATE INDEX `mafengwo_pois_category_idx` ON `mafengwo_pois` (`category`);--> statement-breakpoint
CREATE INDEX `mafengwo_pois_destination_idx` ON `mafengwo_pois` (`destination_id`);--> statement-breakpoint
CREATE INDEX `mafengwo_pois_dest_cat_idx` ON `mafengwo_pois` (`destination_id`,`category`);--> statement-breakpoint
CREATE INDEX `mafengwo_pois_rating_idx` ON `mafengwo_pois` (`rating`);--> statement-breakpoint
CREATE TABLE `mafengwo_qa` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`question_id` text NOT NULL,
	`source_url` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`destination_id` text,
	`destination_name` text,
	`author_name` text,
	`author_id` text,
	`answers_count` integer DEFAULT 0 NOT NULL,
	`views_count` integer DEFAULT 0 NOT NULL,
	`tags` text NOT NULL,
	`best_answer` text,
	`question_created_at` integer,
	`crawled_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mafengwo_qa_question_id_idx` ON `mafengwo_qa` (`question_id`);--> statement-breakpoint
CREATE INDEX `mafengwo_qa_destination_idx` ON `mafengwo_qa` (`destination_id`);--> statement-breakpoint
CREATE INDEX `mafengwo_qa_answers_idx` ON `mafengwo_qa` (`answers_count`);--> statement-breakpoint
CREATE TABLE `mafengwo_rankings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ranking_id` text NOT NULL,
	`source_url` text NOT NULL,
	`ranking_type` text NOT NULL,
	`title` text NOT NULL,
	`destination_id` text,
	`destination_name` text,
	`description` text,
	`items` text NOT NULL,
	`crawled_at` integer NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE INDEX `mafengwo_rankings_ranking_id_idx` ON `mafengwo_rankings` (`ranking_id`);--> statement-breakpoint
CREATE INDEX `mafengwo_rankings_destination_idx` ON `mafengwo_rankings` (`destination_id`);--> statement-breakpoint
CREATE INDEX `mafengwo_rankings_type_idx` ON `mafengwo_rankings` (`ranking_type`);--> statement-breakpoint
CREATE UNIQUE INDEX `mafengwo_rankings_dest_type_idx` ON `mafengwo_rankings` (`destination_id`,`ranking_type`);--> statement-breakpoint
CREATE TABLE `notification_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`push_enabled` integer DEFAULT true NOT NULL,
	`email_enabled` integer DEFAULT false NOT NULL,
	`quiet_hours_start` text,
	`quiet_hours_end` text,
	`categories` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `notification_settings_user_idx` ON `notification_settings` (`user_id`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`type` text NOT NULL,
	`title` text,
	`body` text,
	`data` text,
	`is_read` integer DEFAULT false NOT NULL,
	`read_at` integer,
	`is_push_pending` integer DEFAULT false NOT NULL,
	`push_sent_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `notifications_user_idx` ON `notifications` (`user_id`);--> statement-breakpoint
CREATE INDEX `notifications_user_read_idx` ON `notifications` (`user_id`,`is_read`);--> statement-breakpoint
CREATE INDEX `notifications_user_created_idx` ON `notifications` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `notifications_type_idx` ON `notifications` (`type`);--> statement-breakpoint
CREATE INDEX `notifications_push_pending_idx` ON `notifications` (`is_push_pending`);--> statement-breakpoint
CREATE TABLE `push_tokens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`token` text NOT NULL,
	`platform` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `push_tokens_user_idx` ON `push_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `push_tokens_token_idx` ON `push_tokens` (`token`);--> statement-breakpoint
CREATE INDEX `push_tokens_user_active_idx` ON `push_tokens` (`user_id`,`is_active`);--> statement-breakpoint
CREATE TABLE `scheduled_notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`type` text NOT NULL,
	`title` text,
	`body` text,
	`data` text,
	`scheduled_for` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`sent_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `sched_notif_user_idx` ON `scheduled_notifications` (`user_id`);--> statement-breakpoint
CREATE INDEX `sched_notif_status_idx` ON `scheduled_notifications` (`status`);--> statement-breakpoint
CREATE INDEX `sched_notif_scheduled_idx` ON `scheduled_notifications` (`scheduled_for`);--> statement-breakpoint
CREATE INDEX `sched_notif_status_sched_idx` ON `scheduled_notifications` (`status`,`scheduled_for`);--> statement-breakpoint
CREATE TABLE `poi_answers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`question_id` integer NOT NULL,
	`poi_id` integer,
	`user_id` integer NOT NULL,
	`content` text NOT NULL,
	`image_urls` text,
	`author_name` text,
	`author_avatar_url` text,
	`upvotes_count` integer DEFAULT 0 NOT NULL,
	`downvotes_count` integer DEFAULT 0 NOT NULL,
	`comments_count` integer DEFAULT 0 NOT NULL,
	`is_accepted` integer DEFAULT false NOT NULL,
	`is_best_answer` integer DEFAULT false,
	`is_edited` integer DEFAULT false NOT NULL,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_verified_author` integer DEFAULT false NOT NULL,
	`author_badge_type` text,
	`report_count` integer DEFAULT 0 NOT NULL,
	`is_hidden` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `poi_answers_question_idx` ON `poi_answers` (`question_id`);--> statement-breakpoint
CREATE INDEX `poi_answers_user_idx` ON `poi_answers` (`user_id`);--> statement-breakpoint
CREATE INDEX `poi_answers_q_accepted_idx` ON `poi_answers` (`question_id`,`is_accepted`);--> statement-breakpoint
CREATE INDEX `poi_answers_q_upvotes_idx` ON `poi_answers` (`question_id`,`upvotes_count`);--> statement-breakpoint
CREATE INDEX `poi_answers_created_idx` ON `poi_answers` (`created_at`);--> statement-breakpoint
CREATE TABLE `poi_questions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`poi_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`category` text NOT NULL,
	`tags` text,
	`image_urls` text,
	`views_count` integer DEFAULT 0 NOT NULL,
	`answers_count` integer DEFAULT 0 NOT NULL,
	`followers_count` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`accepted_answer_id` integer,
	`best_answer_id` integer,
	`has_best_answer` integer DEFAULT false,
	`is_edited` integer DEFAULT false NOT NULL,
	`is_pinned` integer DEFAULT false NOT NULL,
	`report_count` integer DEFAULT 0 NOT NULL,
	`is_hidden` integer DEFAULT false NOT NULL,
	`is_deleted` integer DEFAULT false,
	`upvotes_count` integer DEFAULT 0,
	`downvotes_count` integer DEFAULT 0,
	`author_name` text,
	`author_avatar_url` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`last_activity_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `poi_questions_poi_idx` ON `poi_questions` (`poi_id`);--> statement-breakpoint
CREATE INDEX `poi_questions_user_idx` ON `poi_questions` (`user_id`);--> statement-breakpoint
CREATE INDEX `poi_questions_poi_status_idx` ON `poi_questions` (`poi_id`,`status`);--> statement-breakpoint
CREATE INDEX `poi_questions_poi_category_idx` ON `poi_questions` (`poi_id`,`category`);--> statement-breakpoint
CREATE INDEX `poi_questions_status_idx` ON `poi_questions` (`status`);--> statement-breakpoint
CREATE INDEX `poi_questions_category_idx` ON `poi_questions` (`category`);--> statement-breakpoint
CREATE INDEX `poi_questions_created_idx` ON `poi_questions` (`created_at`);--> statement-breakpoint
CREATE INDEX `poi_questions_last_activity_idx` ON `poi_questions` (`last_activity_at`);--> statement-breakpoint
CREATE INDEX `poi_questions_poi_last_idx` ON `poi_questions` (`poi_id`,`last_activity_at`);--> statement-breakpoint
CREATE TABLE `pois` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`external_id` text,
	`name` text NOT NULL,
	`name_en` text,
	`category` text NOT NULL,
	`city_id` integer NOT NULL,
	`address` text,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`rating` real,
	`rating_count` integer DEFAULT 0 NOT NULL,
	`price_level` integer,
	`business_hours` text,
	`best_visit_time` text,
	`phone` text,
	`image_urls` text,
	`source` text NOT NULL,
	`is_hidden_gem` integer,
	`hidden_gem_score` real,
	`hidden_gem_rating` real,
	`hidden_gem_rating_count` integer,
	`local_recommendation` text,
	`popularity_level` text,
	`cuisine_type` text,
	`is_local_favorite` integer,
	`signature_dishes` text,
	`dietary_options` text,
	`average_price` real,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `pois_city_idx` ON `pois` (`city_id`);--> statement-breakpoint
CREATE INDEX `pois_category_idx` ON `pois` (`category`);--> statement-breakpoint
CREATE INDEX `pois_city_category_idx` ON `pois` (`city_id`,`category`);--> statement-breakpoint
CREATE INDEX `pois_external_source_idx` ON `pois` (`external_id`,`source`);--> statement-breakpoint
CREATE INDEX `pois_hidden_gem_idx` ON `pois` (`is_hidden_gem`);--> statement-breakpoint
CREATE INDEX `pois_city_hidden_gem_idx` ON `pois` (`city_id`,`is_hidden_gem`);--> statement-breakpoint
CREATE INDEX `pois_popularity_idx` ON `pois` (`popularity_level`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`display_name` text,
	`avatar_url` text,
	`bio` text,
	`expo_push_token` text,
	`followers_count` integer DEFAULT 0,
	`following_count` integer DEFAULT 0,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `profiles_user_idx` ON `profiles` (`user_id`);--> statement-breakpoint
CREATE INDEX `profiles_email_idx` ON `profiles` (`email`);--> statement-breakpoint
CREATE INDEX `profiles_phone_idx` ON `profiles` (`phone`);--> statement-breakpoint
CREATE TABLE `user_follows` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`follower_id` integer NOT NULL,
	`following_id` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `user_follows_follower_idx` ON `user_follows` (`follower_id`);--> statement-breakpoint
CREATE INDEX `user_follows_following_idx` ON `user_follows` (`following_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_follows_uniq` ON `user_follows` (`follower_id`,`following_id`);--> statement-breakpoint
CREATE TABLE `share_event_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`share_link_id` integer NOT NULL,
	`resource_type` text NOT NULL,
	`resource_id` integer NOT NULL,
	`event_type` text NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`referrer` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `share_logs_link_idx` ON `share_event_logs` (`share_link_id`);--> statement-breakpoint
CREATE INDEX `share_logs_resource_idx` ON `share_event_logs` (`resource_type`,`resource_id`);--> statement-breakpoint
CREATE INDEX `share_logs_created_idx` ON `share_event_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `share_logs_type_idx` ON `share_event_logs` (`event_type`);--> statement-breakpoint
CREATE TABLE `share_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`resource_type` text NOT NULL,
	`resource_id` integer NOT NULL,
	`sharer_id` integer NOT NULL,
	`platform` text,
	`event_type` text NOT NULL,
	`share_link_id` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `share_events_resource_idx` ON `share_events` (`resource_type`,`resource_id`);--> statement-breakpoint
CREATE INDEX `share_events_sharer_idx` ON `share_events` (`sharer_id`);--> statement-breakpoint
CREATE INDEX `share_events_platform_idx` ON `share_events` (`platform`);--> statement-breakpoint
CREATE INDEX `share_events_type_idx` ON `share_events` (`event_type`);--> statement-breakpoint
CREATE INDEX `share_events_created_idx` ON `share_events` (`created_at`);--> statement-breakpoint
CREATE INDEX `share_events_link_idx` ON `share_events` (`share_link_id`);--> statement-breakpoint
CREATE TABLE `share_links` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`share_code` text NOT NULL,
	`resource_type` text NOT NULL,
	`resource_id` integer NOT NULL,
	`owner_id` integer NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`expires_at` integer,
	`view_count` integer DEFAULT 0 NOT NULL,
	`metadata` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `share_links_code_idx` ON `share_links` (`share_code`);--> statement-breakpoint
CREATE INDEX `share_links_resource_idx` ON `share_links` (`resource_type`,`resource_id`);--> statement-breakpoint
CREATE INDEX `share_links_owner_idx` ON `share_links` (`owner_id`);--> statement-breakpoint
CREATE INDEX `share_links_owner_resource_idx` ON `share_links` (`owner_id`,`resource_type`,`resource_id`);--> statement-breakpoint
CREATE INDEX `share_links_active_idx` ON `share_links` (`is_active`);--> statement-breakpoint
CREATE INDEX `share_links_expires_idx` ON `share_links` (`expires_at`);--> statement-breakpoint
CREATE TABLE `content_translations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` integer NOT NULL,
	`field` text NOT NULL,
	`language` text NOT NULL,
	`translated_content` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `content_trans_entity_idx` ON `content_translations` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `content_trans_entity_field_lang_idx` ON `content_translations` (`entity_type`,`entity_id`,`field`,`language`);--> statement-breakpoint
CREATE INDEX `content_trans_type_idx` ON `content_translations` (`entity_type`);--> statement-breakpoint
CREATE TABLE `offline_translation_packs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_language` text NOT NULL,
	`target_language` text NOT NULL,
	`pack_name` text NOT NULL,
	`description` text,
	`size` integer,
	`phrase_count` integer,
	`version` integer DEFAULT 1 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`download_url` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `offline_packs_source_idx` ON `offline_translation_packs` (`source_language`);--> statement-breakpoint
CREATE INDEX `offline_packs_target_idx` ON `offline_translation_packs` (`target_language`);--> statement-breakpoint
CREATE INDEX `offline_packs_pair_idx` ON `offline_translation_packs` (`source_language`,`target_language`);--> statement-breakpoint
CREATE INDEX `offline_packs_active_idx` ON `offline_translation_packs` (`is_active`);--> statement-breakpoint
CREATE TABLE `saved_translations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`source_text` text NOT NULL,
	`translated_text` text NOT NULL,
	`source_language` text NOT NULL,
	`target_language` text NOT NULL,
	`translation_type` text DEFAULT 'phrase' NOT NULL,
	`is_favorite` integer DEFAULT false NOT NULL,
	`last_used_at` integer,
	`use_count` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `saved_trans_user_idx` ON `saved_translations` (`user_id`);--> statement-breakpoint
CREATE INDEX `saved_trans_user_type_idx` ON `saved_translations` (`user_id`,`translation_type`);--> statement-breakpoint
CREATE INDEX `saved_trans_user_fav_idx` ON `saved_translations` (`user_id`,`is_favorite`);--> statement-breakpoint
CREATE INDEX `saved_trans_user_last_idx` ON `saved_translations` (`user_id`,`last_used_at`);--> statement-breakpoint
CREATE TABLE `translation_phrases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category` text NOT NULL,
	`source_language` text NOT NULL,
	`target_language` text NOT NULL,
	`source_text` text NOT NULL,
	`translated_text` text NOT NULL,
	`pronunciation` text,
	`audio_url` text,
	`context` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `trans_phrases_category_idx` ON `translation_phrases` (`category`);--> statement-breakpoint
CREATE INDEX `trans_phrases_source_lang_idx` ON `translation_phrases` (`source_language`);--> statement-breakpoint
CREATE INDEX `trans_phrases_cat_lang_idx` ON `translation_phrases` (`category`,`source_language`);--> statement-breakpoint
CREATE TABLE `user_offline_packs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`pack_id` integer NOT NULL,
	`downloaded_at` integer,
	`version` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `user_offline_packs_user_idx` ON `user_offline_packs` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_offline_packs_pack_idx` ON `user_offline_packs` (`pack_id`);--> statement-breakpoint
CREATE INDEX `user_offline_packs_pair_idx` ON `user_offline_packs` (`user_id`,`pack_id`);--> statement-breakpoint
CREATE TABLE `travel_notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`author_id` integer NOT NULL,
	`title` text NOT NULL,
	`content` text,
	`cover_image_url` text,
	`visibility` text DEFAULT 'public' NOT NULL,
	`itinerary_id` integer,
	`status` text DEFAULT 'draft' NOT NULL,
	`likes_count` integer DEFAULT 0 NOT NULL,
	`comments_count` integer DEFAULT 0 NOT NULL,
	`views_count` integer DEFAULT 0 NOT NULL,
	`saves_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `travel_notes_author_idx` ON `travel_notes` (`author_id`);--> statement-breakpoint
CREATE INDEX `travel_notes_visibility_idx` ON `travel_notes` (`visibility`);--> statement-breakpoint
CREATE INDEX `travel_notes_itinerary_idx` ON `travel_notes` (`itinerary_id`);--> statement-breakpoint
CREATE INDEX `travel_notes_author_vis_idx` ON `travel_notes` (`author_id`,`visibility`);--> statement-breakpoint
CREATE INDEX `travel_notes_created_idx` ON `travel_notes` (`created_at`);