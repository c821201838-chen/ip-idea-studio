CREATE TABLE `drafts` (
	`owner_id` text NOT NULL,
	`id` text NOT NULL,
	`account` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`materials` text NOT NULL,
	`source` text NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`owner_id`, `id`)
);
--> statement-breakpoint
CREATE INDEX `idx_drafts_owner_updated` ON `drafts` (`owner_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`owner_id` text NOT NULL,
	`account` text NOT NULL,
	`name` text NOT NULL,
	`audience` text NOT NULL,
	`focus` text NOT NULL,
	PRIMARY KEY(`owner_id`, `account`)
);
