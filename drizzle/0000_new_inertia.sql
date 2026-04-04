CREATE TABLE `search_results` (
	`id` text PRIMARY KEY NOT NULL,
	`wiki_id` text NOT NULL,
	`source_type` text NOT NULL,
	`source_name` text NOT NULL,
	`url` text,
	`title` text,
	`snippet` text,
	`credibility` integer DEFAULT 3 NOT NULL,
	`info_type` text,
	FOREIGN KEY (`wiki_id`) REFERENCES `wikis`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text DEFAULT 'User' NOT NULL,
	`api_key` text,
	`api_provider` text DEFAULT 'glm5' NOT NULL,
	`preferences` text DEFAULT '{}',
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `wiki_sections` (
	`id` text PRIMARY KEY NOT NULL,
	`wiki_id` text NOT NULL,
	`layer` integer NOT NULL,
	`title` text NOT NULL,
	`content` text,
	`markdown` text,
	`image_urls` text DEFAULT '[]',
	`image_types` text DEFAULT '[]',
	`order` integer DEFAULT 0 NOT NULL,
	`regenerations` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`wiki_id`) REFERENCES `wikis`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `wikis` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`topic` text NOT NULL,
	`knowledge_type` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`outline` text,
	`content` text,
	`markdown` text,
	`sources` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
