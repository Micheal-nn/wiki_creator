import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull().default("User"),
  apiKey: text("api_key"),           // GLM5 API Key
  tavilyApiKey: text("tavily_api_key"), // Tavily API Key
  apiProvider: text("api_provider").notNull().default("glm5"),
  preferences: text("preferences", { mode: "json" })
    .$type<Record<string, unknown>>()
    .default({}),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const wikis = sqliteTable("wikis", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  topic: text("topic").notNull(),
  knowledgeType: text("knowledge_type"),
  status: text("status").notNull().default("draft"),
  outline: text("outline", { mode: "json" }).$type<{
    sections: { layer: number; title: string }[];
  }>(),
  content: text("content", { mode: "json" }).$type<Record<string, unknown>>(),
  markdown: text("markdown"),
  sources: text("sources", { mode: "json" }).$type<
    {
      sourceType: string;
      sourceName: string;
      url: string;
      title: string;
      credibility: number;
    }[]
  >(),
  sourceMetadata: text("source_metadata", { mode: "json" }).$type<
    {
      sourceType: string;
      sourceName: string;
      count: number;
      success: boolean;
      error?: string;
    }[]
  >(),
  sourceWarnings: text("source_warnings", { mode: "json" }).$type<string[]>().default([]),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const wikiSections = sqliteTable("wiki_sections", {
  id: text("id").primaryKey(),
  wikiId: text("wiki_id")
    .notNull()
    .references(() => wikis.id),
  layer: integer("layer").notNull(),
  title: text("title").notNull(),
  content: text("content", { mode: "json" }).$type<Record<string, unknown>>(),
  markdown: text("markdown"),
  imageUrls: text("image_urls", { mode: "json" })
    .$type<string[]>()
    .default([]),
  imageTypes: text("image_types", { mode: "json" })
    .$type<string[]>()
    .default([]),
  order: integer("order").notNull().default(0),
  regenerations: integer("regenerations").notNull().default(0),
});

export const searchResults = sqliteTable("search_results", {
  id: text("id").primaryKey(),
  wikiId: text("wiki_id")
    .notNull()
    .references(() => wikis.id),
  sourceType: text("source_type").notNull(),
  sourceName: text("source_name").notNull(),
  url: text("url"),
  title: text("title"),
  snippet: text("snippet"),
  credibility: integer("credibility").notNull().default(3),
  infoType: text("info_type"),
});
