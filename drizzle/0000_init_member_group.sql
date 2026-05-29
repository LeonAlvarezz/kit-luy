CREATE TABLE `groups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tg_chat_id` text NOT NULL,
	`title` text NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `groups_tg_chat_id_unique` ON `groups` (`tg_chat_id`);--> statement-breakpoint
CREATE TABLE `members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`group_id` integer NOT NULL,
	`tg_user_id` text,
	`display_name` text,
	`alias` text,
	`status` text DEFAULT 'active' NOT NULL,
	`registered_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `members_group_tg_user_id_unique` ON `members` (`group_id`,`tg_user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `members_group_alias_unique` ON `members` (`group_id`,`alias`);