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
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `profiles_user_idx` ON `profiles` (`user_id`);--> statement-breakpoint
CREATE INDEX `profiles_email_idx` ON `profiles` (`email`);--> statement-breakpoint
CREATE INDEX `profiles_phone_idx` ON `profiles` (`phone`);--> statement-breakpoint
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
CREATE INDEX `share_links_expires_idx` ON `share_links` (`expires_at`);