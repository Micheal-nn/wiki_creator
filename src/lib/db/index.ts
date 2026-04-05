import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";
import path from "path";
import fs from "fs";
import { sql } from "drizzle-orm";
import { v4 as uuid } from "uuid";

// Vercel 文件系统只读，使用 /tmp 目录
const DB_PATH = process.env.DATABASE_PATH || 
  (process.env.VERCEL ? "/tmp/wiki-creator.db" : path.join(process.cwd(), "data", "wiki-creator.db"));

function ensureDataDir() {
  const dir = path.dirname(DB_PATH);
  // /tmp 目录在 Vercel 上总是存在
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (error) {
      // Vercel /tmp 目录可能已存在，忽略错误
      console.warn("Could not create data directory:", error);
    }
  }
}

let _client: Client | null = null;
let _db: LibSQLDatabase<typeof schema> | null = null;
let _initialized = false;

/**
 * Initialize database tables and default user
 */
async function initializeDatabase(db: LibSQLDatabase<typeof schema>) {
  if (_initialized) return;
  
  // Create tables using raw SQL (drizzle-orm/libsql doesn't support migrate well)
  const client = createClient({ url: `file:${DB_PATH}` });
  
  await client.batch([
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT 'User',
      api_key TEXT,
      tavily_api_key TEXT,
      api_provider TEXT NOT NULL DEFAULT 'glm5',
      preferences TEXT DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS wikis (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      topic TEXT NOT NULL,
      knowledge_type TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      outline TEXT,
      content TEXT,
      markdown TEXT,
      sources TEXT,
      source_metadata TEXT,
      source_warnings TEXT DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS wiki_sections (
      id TEXT PRIMARY KEY,
      wiki_id TEXT NOT NULL REFERENCES wikis(id),
      layer INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      markdown TEXT,
      image_urls TEXT DEFAULT '[]',
      image_types TEXT DEFAULT '[]',
      "order" INTEGER NOT NULL DEFAULT 0,
      regenerations INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS search_results (
      id TEXT PRIMARY KEY,
      wiki_id TEXT NOT NULL REFERENCES wikis(id),
      source_type TEXT NOT NULL,
      source_name TEXT NOT NULL,
      url TEXT,
      title TEXT,
      snippet TEXT,
      credibility INTEGER NOT NULL DEFAULT 3,
      info_type TEXT
    )`,
  ]);

  // Create default user if not exists
  const [existingUser] = await db.select().from(schema.users).limit(1);
  if (!existingUser) {
    await db.insert(schema.users).values({
      id: uuid(),
      name: "Default User",
      apiProvider: "glm5",
    });
  }

  _initialized = true;
}

export function getDb(): LibSQLDatabase<typeof schema> {
  if (_db) return _db;

  ensureDataDir();

  _client = createClient({
    url: `file:${DB_PATH}`,
  });

  _db = drizzle(_client, { schema });
  return _db;
}

/**
 * Get database and ensure it's initialized
 */
export async function getInitializedDb(): Promise<LibSQLDatabase<typeof schema>> {
  const db = getDb();
  await initializeDatabase(db);
  return db;
}

export { schema };
