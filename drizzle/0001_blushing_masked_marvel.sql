CREATE TABLE `topic_pools` (
	`owner_id` text NOT NULL,
	`account` text NOT NULL,
	`topics` text NOT NULL,
	`source` text NOT NULL,
	`subject` text NOT NULL,
	`engine` text NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`owner_id`, `account`)
);
--> statement-breakpoint
ALTER TABLE `profiles` ADD `persona` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `tone` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `pillars` text DEFAULT '' NOT NULL;