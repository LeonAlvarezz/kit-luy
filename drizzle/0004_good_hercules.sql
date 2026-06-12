CREATE TABLE `telegram_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tg_user_id` text NOT NULL,
	`username` text,
	`display_name` text,
	`payment_qr_file_id` text,
	`payment_qr_updated_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `telegram_users_tg_user_id_unique` ON `telegram_users` (`tg_user_id`);
