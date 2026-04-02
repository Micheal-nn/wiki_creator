# Wiki Creator Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Next.js 15 full-stack web app that takes a knowledge topic as input, searches multiple authoritative sources, generates a structured 4-layer pyramid wiki with diagrams, and provides a Tiptap editor for viewing/editing/exporting.

**Architecture:** Pure Next.js app (no external AI platforms). LLM orchestration in TypeScript. GLM5 API for LLM. SQLite + Drizzle ORM for data. Tiptap for editing. Mermaid + html-to-image for charts.

**Tech Stack:** Next.js 15, React 19, TypeScript, TailwindCSS, shadcn/ui, Tiptap, Drizzle ORM, SQLite (better-sqlite3), Tavily API, Semantic Scholar API, arXiv API, GLM5 API, Mermaid.js, html-to-image

**Design Doc:** `docs/plans/2026-04-02-wiki-creator-design.md`

---

## Dependency Graph

```
Task 1: Project Scaffold
    │
    ▼
Task 2: Database Schema
    │
    ├──────────────┬──────────────┐
    ▼              ▼              ▼
Task 3: Search    Task 4: LLM    Task 6: Charts
    │              │              │
    └──────┬───────┘              │
           ▼                      │
    Task 5: Wiki Workflow         │
           │                      │
           └──────────┬───────────┘
                      ▼
           Task 7: API Routes
                      │
           ┌──────────┼──────────┐
           ▼          ▼          ▼
    Task 8: Home  Task 10: Settings  Task 11: History
           │
           ▼
    Task 9: Wiki Editor
           │
           ▼
    Task 12: Sources Page
```

Parallel batches:
- **Batch 1:** Task 1 (sequential - foundation)
- **Batch 2:** Task 2 (sequential - depends on scaffold)
- **Batch 3:** Tasks 3, 4, 6 (PARALLEL - independent modules)
- **Batch 4:** Task 5 (sequential - depends on 3+4)
- **Batch 5:** Task 7 (sequential - depends on all backend modules)
- **Batch 6:** Tasks 8, 10, 11 (PARALLEL - independent frontend pages)
- **Batch 7:** Task 9 (sequential - most complex page, depends on API)
- **Batch 8:** Task 12 (sequential - depends on wiki editor)

---

### Task 1: Project Scaffold

**Goal:** Initialize Next.js 15 project with all dependencies, project structure, TailwindCSS, shadcn/ui, and basic layout.

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- Create: `src/lib/` directory structure
- Create: `.env.example`, `.gitignore`

**Step 1: Initialize Next.js project**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack
```

**Step 2: Install dependencies**

```bash
npm install drizzle-orm better-sqlite3 uuid
npm install -D drizzle-kit @types/better-sqlite3 @types/uuid
npm install @tiptap/react @tiptap/starter-kit @tiptap/pm @tiptap/extension-image @tiptap/extension-link @tiptap/extension-placeholder @tiptap/extension-heading @tiptap/extension-code-block-lowlight @tiptap/extension-collaboration
npm install mermaid html-to-image
npm install zod nanoid
npm install -D @types/mermaid
```

**Step 3: Initialize shadcn/ui**

```bash
npx shadcn@latest init
```

Choose: New York style, Zinc base color, CSS variables yes.

Then add components:
```bash
npx shadcn@latest add button input card dialog tabs textarea badge separator scroll-area dropdown-menu sheet toast skeleton progress
```

**Step 4: Create project directory structure**

```
src/
├── app/
│   ├── layout.tsx          (root layout with sidebar)
│   ├── page.tsx            (home page)
│   ├── globals.css
│   ├── wiki/
│   │   └── [id]/
│   │       └── page.tsx    (wiki editor page)
│   ├── settings/
│   │   └── page.tsx        (settings page)
│   ├── history/
│   │   └── page.tsx        (history page)
│   └── api/
│       ├── search/
│       │   └── route.ts
│       ├── generate/
│       │   └── route.ts
│       ├── wikis/
│       │   └── route.ts
│       ├── wikis/[id]/
│       │   └── route.ts
│       ├── sections/
│       │   └── [id]/
│       │       └── regenerate/
│       │           └── route.ts
│       └── export/
│           └── [id]/
│               └── route.ts
├── components/
│   ├── ui/                 (shadcn components)
│   ├── wiki/
│   │   ├── wiki-editor.tsx
│   │   ├── outline-nav.tsx
│   │   ├── section-block.tsx
│   │   └── progress-bar.tsx
│   ├── home/
│   │   └── topic-input.tsx
│   └── layout/
│       ├── header.tsx
│       └── sidebar.tsx
├── lib/
│   ├── db/
│   │   ├── index.ts        (db connection)
│   │   ├── schema.ts       (drizzle schema)
│   │   └── migrate.ts      (migration runner)
│   ├── search/
│   │   ├── types.ts        (unified search types)
│   │   ├── tavily.ts       (Tavily adapter)
│   │   ├── semantic-scholar.ts (S2 adapter)
│   │   ├── arxiv.ts        (arXiv adapter)
│   │   └── aggregator.ts   (multi-source aggregator)
│   ├── llm/
│   │   ├── client.ts       (GLM5 API client)
│   │   ├── prompts.ts      (prompt templates)
│   │   └── orchestrator.ts (workflow orchestrator)
│   ├── charts/
│   │   ├── mermaid-renderer.ts
│   │   ├── infographic-renderer.ts
│   │   └── chart-decision.ts
│   ├── wiki/
│   │   ├── generator.ts    (main wiki generation pipeline)
│   │   └── markdown.ts     (markdown export utilities)
│   └── utils.ts            (shared utilities)
└── types/
    └── index.ts            (shared TypeScript types)
```

Create placeholder files for all directories with index files or empty exports.

**Step 5: Create `.env.example`**

```env
# GLM5 API
GLM5_API_KEY=your_glm5_api_key_here
GLM5_BASE_URL=https://open.bigmodel.cn/api/paas/v4

# Tavily Search
TAVILY_API_KEY=your_tavily_api_key_here

# Database
DATABASE_PATH=./data/wiki-creator.db
```

**Step 6: Create basic root layout**

`src/app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Wiki Creator",
  description: "Turn any knowledge topic into a structured, illustrated wiki",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

**Step 7: Create placeholder home page**

`src/app/page.tsx`:
```tsx
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-4">Wiki Creator</h1>
      <p className="text-muted-foreground">输入知识点，生成结构化 Wiki</p>
    </main>
  );
}
```

**Step 8: Create shared types**

`src/types/index.ts`:
```typescript
// Knowledge type classification
export type KnowledgeType =
  | "mathematical"    // 数学原理型
  | "physical"        // 物理原理型
  | "architectural"   // 架构/系统型
  | "logical"         // 逻辑/算法型
  | "conceptual"      // 概念/理论型
  | "practical";      // 实践/工具型

// Pyramid layer levels
export type LayerLevel = 1 | 2 | 3 | 4;

// Search source types
export type SourceType = "academic" | "technical" | "general";

// Info types for search results
export type InfoType = "definition" | "principle" | "analogy" | "application" | "misconception";

// Credibility score (1-5)
export type CredibilityScore = 1 | 2 | 3 | 4 | 5;

// Chart types
export type ChartType = "mermaid" | "infographic" | "ai-image" | "table" | "mindmap";

// Wiki generation status
export type WikiStatus = "draft" | "generating" | "ready" | "error";

// Structured search result
export interface SearchResult {
  sourceType: SourceType;
  sourceName: string;
  url: string;
  title: string;
  snippet: string;
  credibility: CredibilityScore;
  infoType: InfoType;
}

// Structured material package (output of Step 1)
export interface MaterialPackage {
  topic: string;
  searchResults: SearchResult[];
  llmSupplement: string;
  llmSupplementAreas: string[];
}

// Wiki section (one layer block)
export interface WikiSection {
  layer: LayerLevel;
  title: string;
  markdown: string;
  imageInstructions: ChartInstruction[];
}

// Chart generation instruction
export interface ChartInstruction {
  type: ChartType;
  description: string;
  mermaidCode?: string;       // for mermaid charts
  templateData?: Record<string, string>; // for infographic templates
}

// Wiki generation progress
export interface GenerationProgress {
  stage: "searching" | "filtering" | "fusing" | "classifying" | "generating" | "rendering-charts" | "reviewing" | "done" | "error";
  message: string;
  progress: number; // 0-100
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

**Step 9: Initialize git and commit**

```bash
git init
git add .
git commit -m "feat: initialize Next.js 15 project with Tiptap, Drizzle, shadcn/ui"
```

---

### Task 2: Database Schema

**Goal:** Define Drizzle ORM schema for all tables, set up SQLite connection, create migration.

**Files:**
- Create: `src/lib/db/schema.ts`
- Create: `src/lib/db/index.ts`
- Create: `src/lib/db/migrate.ts`
- Create: `drizzle.config.ts`

**Step 1: Define schema in `src/lib/db/schema.ts`**

```typescript
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(), // UUID
  name: text("name").notNull().default("User"),
  apiKey: text("api_key"), // encrypted GLM5 key
  apiProvider: text("api_provider").notNull().default("glm5"),
  preferences: text("preferences", { mode: "json" }).$type<Record<string, unknown>>().default({}),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const wikis = sqliteTable("wikis", {
  id: text("id").primaryKey(), // UUID
  userId: text("user_id").notNull().references(() => users.id),
  topic: text("topic").notNull(),
  knowledgeType: text("knowledge_type"), // mathematical, physical, etc.
  status: text("status").notNull().default("draft"), // draft, generating, ready, error
  outline: text("outline", { mode: "json" }).$type<Record<string, unknown>>(),
  content: text("content", { mode: "json" }).$type<Record<string, unknown>>(),
  markdown: text("markdown"),
  sources: text("sources", { mode: "json" }).$type<Record<string, unknown>[]>(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const wikiSections = sqliteTable("wiki_sections", {
  id: text("id").primaryKey(), // UUID
  wikiId: text("wiki_id").notNull().references(() => wikis.id),
  layer: integer("layer").notNull(), // 1-4
  title: text("title").notNull(),
  content: text("content", { mode: "json" }).$type<Record<string, unknown>>(),
  markdown: text("markdown"),
  imageUrls: text("image_urls", { mode: "json" }).$type<string[]>().default([]),
  imageTypes: text("image_types", { mode: "json" }).$type<string[]>().default([]),
  order: integer("order").notNull().default(0),
  regenerations: integer("regenerations").notNull().default(0),
});

export const searchResults = sqliteTable("search_results", {
  id: text("id").primaryKey(), // UUID
  wikiId: text("wiki_id").notNull().references(() => wikis.id),
  sourceType: text("source_type").notNull(), // academic, technical, general
  sourceName: text("source_name").notNull(), // Tavily, Semantic Scholar, etc.
  url: text("url"),
  title: text("title"),
  snippet: text("snippet"),
  credibility: integer("credibility").notNull().default(3), // 1-5
  infoType: text("info_type"), // definition, principle, analogy, etc.
});
```

**Step 2: Create DB connection in `src/lib/db/index.ts`**

```typescript
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "wiki-creator.db");

// Ensure data directory exists
import fs from "fs";
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const sqlite = new Database(DB_PATH);
// Enable WAL mode for better concurrent read performance
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite, { schema });
export { schema };
```

**Step 3: Create `drizzle.config.ts`**

```typescript
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_PATH || "./data/wiki-creator.db",
  },
} satisfies Config;
```

**Step 4: Create migration runner `src/lib/db/migrate.ts`**

```typescript
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db } from "./index";

export function runMigrations() {
  migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations completed");
}
```

**Step 5: Generate migration**

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

**Step 6: Verify with a simple test**

Create `src/lib/db/seed.ts`:
```typescript
import { db } from "./index";
import { users } from "./schema";
import { v4 as uuid } from "uuid";

export async function seed() {
  // Create default user
  const defaultUser = {
    id: uuid(),
    name: "Default User",
    apiProvider: "glm5",
  };

  await db.insert(users).values(defaultUser).onConflictDoNothing();
  console.log("Seed completed");
  return defaultUser.id;
}
```

**Step 7: Commit**

```bash
git add .
git commit -m "feat: add Drizzle ORM schema and SQLite connection"
```

---

### Task 3: Search Aggregation Module

**Goal:** Implement multi-source search adapters (Tavily, Semantic Scholar, arXiv) with a unified aggregator.

**Files:**
- Create: `src/lib/search/types.ts`
- Create: `src/lib/search/tavily.ts`
- Create: `src/lib/search/semantic-scholar.ts`
- Create: `src/lib/search/arxiv.ts`
- Create: `src/lib/search/aggregator.ts`

**Context:**
- `src/types/index.ts` already defines `SearchResult`, `SourceType`, `InfoType`, `CredibilityScore`
- Tavily API: POST `https://api.tavily.com/search`, auth via `api_key` field in body
- Semantic Scholar API: GET `https://api.semanticscholar.org/graph/v1/paper/search?query=...&fields=title,abstract,citationCount,authors,url`
- arXiv API: GET `http://export.arxiv.org/api/query?search_query=all:...&start=0&max_results=10`

**Requirements:**
1. Each adapter has a unified interface: `search(query: string): Promise<SearchResult[]>`
2. Tavily adapter: general web search, credibility default 3
3. Semantic Scholar adapter: academic papers, credibility default 5, extracts title/abstract/citations
4. arXiv adapter: preprints, credibility default 4, parses Atom XML
5. Aggregator runs all adapters in parallel with Promise.allSettled (failures don't block others)
6. Aggregator returns deduplicated results sorted by credibility

**MUST NOT:**
- Use any AI/LLM in this module (that's the LLM module's job)
- Make assumptions about rate limits — add basic retry with exponential backoff
- Block on slow sources — use Promise.allSettled, set per-source timeout

---

### Task 4: LLM Client + Prompt Templates

**Goal:** Implement GLM5 API client and all prompt templates for the wiki generation pipeline.

**Files:**
- Create: `src/lib/llm/client.ts`
- Create: `src/lib/llm/prompts.ts`
- Create: `src/lib/llm/orchestrator.ts`

**Context:**
- GLM5 API is OpenAI-compatible: base URL `https://open.bigmodel.cn/api/paas/v4`
- Endpoints: `/chat/completions` for text, may have image generation
- User's API key stored in `users.apiKey` (from DB)
- `src/types/index.ts` defines `KnowledgeType`, `MaterialPackage`, `WikiSection`, etc.

**Requirements:**

`client.ts`:
1. OpenAI-compatible client using `fetch` (no SDK dependency)
2. Streaming support (SSE parsing for real-time generation progress)
3. Functions: `chatCompletion(messages, options)` and `chatCompletionStream(messages, onChunk)`
4. Accept API key as parameter (not hardcoded)
5. Error handling: rate limit, timeout, invalid key

`prompts.ts`:
1. `KNOWLEDGE_TYPE_CLASSIFICATION` prompt — classifies topic into KnowledgeType
2. `SEARCH_RESULT_FILTER` prompt — filters and scores search results
3. `KNOWLEDGE_FUSION` prompt — identifies blind spots and supplements with LLM knowledge
4. `OUTLINE_GENERATION` prompt — generates 4-layer pyramid outline based on KnowledgeType
5. `SECTION_GENERATION` prompts — one per layer, with layer-specific instructions:
   - Layer 1: "10-second intuition" — one-liner + analogy
   - Layer 2: "Why it works" — math/physics/architecture/logic based on type
   - Layer 3: "Deep dive" — full proofs, edge cases, concept relationships (mark as collapsible)
   - Layer 4: "How to use" — real applications, code examples, common mistakes
6. `CHART_DECISION` prompt — decides what charts go where
7. `XIAOHONGSHU_GENERATION` prompt — placeholder for Phase 2
8. All prompts use template literal functions, not hardcoded strings

`orchestrator.ts`:
1. Pipeline: search → filter → fuse → classify → outline → sections → chart decisions
2. Each step calls the LLM with the appropriate prompt
3. Returns structured `MaterialPackage` and `WikiSection[]`
4. Accepts a progress callback: `(progress: GenerationProgress) => void`

**MUST NOT:**
- Hardcode any API key
- Use `as any` type assertions
- Make prompts monolithic — each prompt should be a focused, reusable template

---

### Task 5: Wiki Generation Pipeline

**Goal:** Wire together the search module, LLM orchestrator, and DB to create the full wiki generation pipeline.

**Files:**
- Create: `src/lib/wiki/generator.ts`
- Create: `src/lib/wiki/markdown.ts`

**Context:**
- Depends on: Task 2 (DB), Task 3 (Search), Task 4 (LLM)
- `src/lib/db/schema.ts` — wikis, wikiSections, searchResults tables
- `src/lib/search/aggregator.ts` — `aggregatedSearch(topic)` function
- `src/lib/llm/orchestrator.ts` — `orchestrateGeneration(materials, onProgress)` function
- `src/types/index.ts` — `WikiStatus`, `GenerationProgress`, `WikiSection`

**Requirements:**

`generator.ts`:
1. Main function: `generateWiki(topic: string, userId: string, apiKey: string, onProgress?: (p: GenerationProgress) => void): Promise<Wiki>`
2. Steps:
   a. Create wiki record in DB with status "generating"
   b. Run aggregated search (Task 3)
   c. Run LLM orchestration pipeline (Task 4)
   d. Save search results to DB
   e. Save wiki sections to DB
   f. Combine all sections into full markdown
   g. Update wiki record with content + status "ready"
   h. On error: update status to "error" with error message
3. Section regeneration: `regenerateSection(wikiId: string, sectionId: string, apiKey: string): Promise<WikiSection>`
4. Progress reporting through the `onProgress` callback

`markdown.ts`:
1. `sectionsToMarkdown(sections: WikiSection[]): string` — combines sections into full markdown
2. `exportMarkdown(wiki: Wiki): string` — formats complete wiki for export
3. Handle image references (local URLs → relative paths for export)

**MUST NOT:**
- Call LLM without user's API key from DB
- Leave wiki in "generating" status on error
- Mutate DB records directly — use Drizzle query builder

---

### Task 6: Chart Rendering Module

**Goal:** Implement Mermaid diagram rendering and HTML-to-image infographic generation.

**Files:**
- Create: `src/lib/charts/mermaid-renderer.ts`
- Create: `src/lib/charts/infographic-renderer.ts`
- Create: `src/lib/charts/chart-decision.ts`
- Create: `src/app/api/charts/render/route.ts`

**Context:**
- Mermaid.js can render in Node.js with `@mermaid-js/mermaid-cli` or in browser
- `html-to-image` works in browser, not server — charts rendered client-side or via API route
- `src/types/index.ts` defines `ChartType`, `ChartInstruction`

**Requirements:**

`mermaid-renderer.ts`:
1. Takes mermaid code string, renders to SVG string
2. Uses dynamic import of mermaid (client-side only, no SSR)
3. `renderMermaid(code: string): Promise<string>` returns SVG data URI

`infographic-renderer.ts`:
1. Takes template name + data, renders HTML, converts to PNG
2. Predefined templates: "comparison", "flow", "timeline", "card-list"
3. Uses html-to-image for client-side rendering
4. `renderInfographic(template: string, data: Record<string, string>): Promise<string>` returns PNG data URI

`chart-decision.ts`:
1. Takes the chart instructions from LLM output
2. Routes to the appropriate renderer
3. Returns rendered image URLs

**MUST NOT:**
- Import mermaid at module level (SSR incompatible) — use dynamic imports
- Block page rendering on chart generation — charts load asynchronously

---

### Task 7: API Routes

**Goal:** Implement all backend API endpoints.

**Files:**
- Create: `src/app/api/wikis/route.ts` (GET list, POST create)
- Create: `src/app/api/wikis/[id]/route.ts` (GET one, PATCH update, DELETE)
- Create: `src/app/api/generate/route.ts` (POST start generation)
- Create: `src/app/api/sections/[id]/regenerate/route.ts` (POST regenerate section)
- Create: `src/app/api/export/[id]/route.ts` (GET export markdown)

**Context:**
- Depends on: Tasks 2-6 (all backend modules)
- Uses Drizzle ORM for DB queries
- Uses wiki generator for generation pipeline
- `src/types/index.ts` defines `ApiResponse<T>`

**Requirements:**

`/api/wikis`:
- GET: List all wikis (ordered by created_at desc)
- POST: Create a new wiki (just creates DB record with topic + status "draft")

`/api/wikis/[id]`:
- GET: Get single wiki with sections
- PATCH: Update wiki content/markdown
- DELETE: Delete wiki and its sections

`/api/generate`:
- POST: Start wiki generation for a topic
- Body: `{ topic: string, userId: string }`
- Returns wiki ID immediately, generation runs in background
- Uses Server-Sent Events (SSE) for progress updates: GET `/api/generate/[id]/progress`

`/api/sections/[id]/regenerate`:
- POST: Regenerate a specific section
- Returns updated section

`/api/export/[id]`:
- GET: Export wiki as markdown file download
- Sets Content-Disposition header for download

**MUST NOT:**
- Block the response on generation — use background processing
- Forget error handling — all routes return `ApiResponse<T>` format
- Expose API keys in responses

---

### Task 8: Home Page

**Goal:** Build the landing page with topic input and recent wiki history.

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/components/home/topic-input.tsx`
- Create: `src/components/layout/header.tsx`

**Requirements:**
1. Centered hero with topic input (large text input + submit button)
2. Below: recent wikis grid (cards showing topic, date, status)
3. Submitting triggers navigation to `/wiki/[newId]` with generation starting
4. Loading state with skeleton cards
5. Responsive layout
6. Header with logo, navigation (Home, History, Settings)

**MUST NOT:**
- Start generation on the client — call API route
- Hardcode API URLs — use relative paths
- Skip loading/error states

---

### Task 9: Wiki Editor Page

**Goal:** Build the main wiki editor with Tiptap, outline navigation, layer folding, chart display, and export.

**Files:**
- Create: `src/app/wiki/[id]/page.tsx`
- Create: `src/components/wiki/wiki-editor.tsx`
- Create: `src/components/wiki/outline-nav.tsx`
- Create: `src/components/wiki/section-block.tsx`
- Create: `src/components/wiki/progress-bar.tsx`
- Create: `src/components/wiki/chart-display.tsx`

**Context:**
- This is the most complex page — Tiptap editor, real-time preview, SSE progress, chart rendering
- Tiptap must be client-only (no SSR) — wrap in dynamic import with `ssr: false`
- SSE for generation progress updates
- Layer 3 sections are collapsible by default

**Requirements:**

`wiki/[id]/page.tsx`:
1. Server component that fetches wiki data
2. Renders WikiEditor client component
3. SSE connection for generation progress

`wiki-editor.tsx`:
1. Tiptap editor with custom extensions:
   - Image extension (for rendered charts)
   - Heading extension (for layer headers)
   - Code block with syntax highlighting
   - Collapsible sections (Layer 3)
2. Split view: outline nav (left) + editor (right)
3. Toolbar: bold, italic, headings, code, image
4. Real-time content sync to DB (debounced)

`outline-nav.tsx`:
1. Displays wiki outline with layer indicators (1-4)
2. Click to scroll to section
3. Layer 3 shows collapsed indicator
4. Shows generation progress per section
5. "Info Sources" link at bottom

`section-block.tsx`:
1. Renders a single section with layer styling
2. Layer 1: highlight box with icon
3. Layer 2: standard section
4. Layer 3: collapsible with disclosure
5. Layer 4: application cards
6. "Regenerate" button per section
7. Chart display area (loads async)

`progress-bar.tsx`:
1. Shows current generation stage
2. Animated progress bar
3. Stage labels: searching → filtering → fusing → classifying → generating → rendering → done

**MUST NOT:**
- Import Tiptap at module level — use `'use client'` + dynamic import
- Block editor while charts load — charts appear asynchronously
- Lose user edits on regeneration of other sections

---

### Task 10: Settings Page

**Goal:** API Key management and user preferences.

**Files:**
- Create: `src/app/settings/page.tsx`
- Create: `src/app/api/settings/route.ts` (GET/PATCH)

**Requirements:**
1. API Key input (password field with show/hide toggle)
2. API Provider selector (GLM5, OpenAI, etc.)
3. Preference toggles (optional: default explanation style)
4. Save button with success toast
5. API Key validation (test call on save)

---

### Task 11: History Page

**Goal:** List all generated wikis with search and filter.

**Files:**
- Create: `src/app/history/page.tsx`

**Requirements:**
1. Table/card grid of all wikis
2. Columns: topic, knowledge type, status, created date, actions
3. Filter by status (draft/ready/error)
4. Search by topic name
5. Click to open wiki editor
6. Delete with confirmation dialog

---

### Task 12: Sources Page (Wiki Sub-page)

**Goal:** Display the search sources used for a wiki with credibility scores and source links.

**Files:**
- Create: `src/components/wiki/sources-panel.tsx`
- Create: `src/app/api/wikis/[id]/sources/route.ts`

**Requirements:**
1. Slide-out panel (Sheet component) from wiki editor
2. Group sources by type (academic, technical, general)
3. Each source shows: title, snippet, credibility badge, link to original
4. Color-coded credibility: 5=green, 4=blue, 3=yellow, 2=orange, 1=red
5. Filter by credibility level
6. Distinguish: [搜索来源] vs [模型补充]

---
