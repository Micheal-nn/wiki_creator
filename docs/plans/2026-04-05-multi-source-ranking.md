# Multi-Source Data Ranking Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement strict multi-source data fetching with per-source credibility ranking (top 20 per source, max 80 total).

**Architecture:** Each of 4 data sources (Tavily, Semantic Scholar, arXiv, LLM) returns up to 20 results. Results are kept in per-source buckets, sorted by credibility, then merged. Empty/failed sources show warnings instead of blocking.

**Tech Stack:** Next.js, TypeScript, existing search adapters

**Design Doc:** `docs/plans/2026-04-05-multi-source-ranking-design.md`

---

## Task 1: Update Type Definitions

**Files:**
- Modify: `src/lib/search/types.ts`

**Step 1: Add new type definitions**

Add to `src/lib/search/types.ts`:

```typescript
import type { SourceType } from "@/types";

// Per-source result bucket for transparency
export interface SourceBucket {
  sourceType: SourceType;
  sourceName: string;
  results: RawSearchResult[];
  success: boolean;
  error?: string;
}

// Enhanced aggregation result with per-source breakdown
export interface AggregatedSearchResult {
  // Final merged results (max 80, top 20 per source)
  results: SearchResult[];
  
  // Per-source breakdown for UI transparency
  sourceBuckets: {
    tavily: SourceBucket;
    semanticScholar: SourceBucket;
    arxiv: SourceBucket;
    llm: SourceBucket;
  };
  
  // Summary counts per source type
  sourceCounts: Record<string, number>;
  
  // Total results used (after dedup)
  totalUsed: number;
  
  // Warnings for empty/failed sources
  warnings: string[];
}

// Type alias for the existing SearchResult (import from @/types)
export type { SearchResult } from "@/types";
```

**Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/search/types.ts
git commit -m "feat(search): add SourceBucket and AggregatedSearchResult types"
```

---

## Task 2: Increase Tavily Fetch Limit

**Files:**
- Modify: `src/lib/search/tavily.ts:69`

**Step 1: Change max_results from 10 to 20**

In `src/lib/search/tavily.ts`, line 69:

```typescript
// Before
max_results: 10,

// After
max_results: 20,
```

**Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/search/tavily.ts
git commit -m "feat(search): increase Tavily max_results to 20"
```

---

## Task 3: Increase Semantic Scholar Fetch Limit

**Files:**
- Modify: `src/lib/search/semantic-scholar.ts:28`

**Step 1: Change limit from 10 to 20**

In `src/lib/search/semantic-scholar.ts`, line 28:

```typescript
// Before
limit: "10",

// After
limit: "20",
```

**Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/search/semantic-scholar.ts
git commit -m "feat(search): increase Semantic Scholar limit to 20"
```

---

## Task 4: Increase arXiv Fetch Limit

**Files:**
- Modify: `src/lib/search/arxiv.ts:58`

**Step 1: Change max_results from 10 to 20**

In `src/lib/search/arxiv.ts`, line 58:

```typescript
// Before
max_results: "10",

// After
max_results: "20",
```

**Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/search/arxiv.ts
git commit -m "feat(search): increase arXiv max_results to 20"
```

---

## Task 5: Rewrite Aggregator with Bucket Logic

**Files:**
- Modify: `src/lib/search/aggregator.ts`

**Step 1: Replace entire aggregator implementation**

Replace the entire content of `src/lib/search/aggregator.ts`:

```typescript
import type { SearchResult, SourceType } from "@/types";
import type { SearchAdapter, RawSearchResult, AggregatedSearchResult, SourceBucket } from "./types";
import { TavilyAdapter } from "./tavily";
import { SemanticScholarAdapter } from "./semantic-scholar";
import { ArxivAdapter } from "./arxiv";
import { LLMAdapter } from "./llm";

const MAX_PER_SOURCE = 20;

export async function aggregatedSearch(
  topic: string,
  tavilyApiKey?: string,
  glm5ApiKey?: string
): Promise<AggregatedSearchResult> {
  console.log("[Search] Starting aggregated search for:", topic);

  // Initialize adapters
  const adapterConfigs = [
    { 
      adapter: new TavilyAdapter(tavilyApiKey), 
      key: 'tavily' as const,
      sourceType: 'general' as SourceType,
      sourceName: 'Tavily'
    },
    { 
      adapter: new SemanticScholarAdapter(), 
      key: 'semanticScholar' as const,
      sourceType: 'academic' as SourceType,
      sourceName: 'Semantic Scholar'
    },
    { 
      adapter: new ArxivAdapter(), 
      key: 'arxiv' as const,
      sourceType: 'academic' as SourceType,
      sourceName: 'arXiv'
    },
    { 
      adapter: new LLMAdapter(glm5ApiKey), 
      key: 'llm' as const,
      sourceType: 'llm' as SourceType,
      sourceName: 'GLM5 知识库'
    },
  ];

  console.log("[Search] Adapters initialized:", adapterConfigs.map(c => c.sourceName));

  // Fetch from all sources in parallel
  const fetchResults = await Promise.all(
    adapterConfigs.map(async ({ adapter, key, sourceType, sourceName }) => {
      console.log(`[Search] Calling ${sourceName}...`);
      const startTime = Date.now();
      try {
        const raw = await adapter.search(topic);
        const duration = Date.now() - startTime;
        console.log(`[Search] ${sourceName} returned ${raw.length} results in ${duration}ms`);
        return { key, results: raw, success: true, sourceType, sourceName };
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[Search] ${sourceName} failed after ${duration}ms:`, error);
        return { 
          key, 
          results: [] as RawSearchResult[], 
          success: false, 
          error: String(error),
          sourceType,
          sourceName
        };
      }
    })
  );

  // Initialize source buckets
  const sourceBuckets: AggregatedSearchResult['sourceBuckets'] = {
    tavily: { sourceType: 'general', sourceName: 'Tavily', results: [], success: true },
    semanticScholar: { sourceType: 'academic', sourceName: 'Semantic Scholar', results: [], success: true },
    arxiv: { sourceType: 'academic', sourceName: 'arXiv', results: [], success: true },
    llm: { sourceType: 'llm', sourceName: 'GLM5 知识库', results: [], success: true },
  };

  const warnings: string[] = [];

  // Populate buckets, sort by credibility, take top 20
  for (const { key, results, success, error, sourceName } of fetchResults) {
    const bucket = sourceBuckets[key];
    bucket.success = success;
    bucket.error = error;
    
    // Sort by credibility descending, take top 20
    const sorted = [...results].sort((a, b) => b.credibility - a.credibility);
    const topResults = sorted.slice(0, MAX_PER_SOURCE);
    bucket.results = topResults;
    
    // Generate warnings
    if (!success) {
      if (error?.includes('API_KEY_NOT_CONFIGURED')) {
        warnings.push(`${sourceName}: API Key 未配置`);
      } else if (error?.includes('429')) {
        warnings.push(`${sourceName}: API 限流，已跳过`);
      } else {
        warnings.push(`${sourceName}: API 错误 (${error})`);
      }
    } else if (topResults.length === 0) {
      warnings.push(`${sourceName}: 无相关结果`);
    }
    
    console.log(`[Search] ${sourceName}: ${topResults.length}/${results.length} results used`);
  }

  // Merge all buckets into final results
  const allResults: SearchResult[] = [];
  const sourceCounts: Record<string, number> = {};

  for (const bucket of Object.values(sourceBuckets)) {
    for (const r of bucket.results) {
      allResults.push({
        sourceType: r.infoType === 'principle' && bucket.sourceType === 'academic' ? 'academic' : bucket.sourceType,
        sourceName: bucket.sourceName,
        url: r.url,
        title: r.title,
        snippet: r.snippet,
        credibility: r.credibility,
        infoType: r.infoType,
      });
    }
    sourceCounts[bucket.sourceType] = (sourceCounts[bucket.sourceType] || 0) + bucket.results.length;
  }

  // Deduplicate by URL
  const seen = new Set<string>();
  const deduped = allResults.filter((r) => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });

  // Sort globally by credibility
  deduped.sort((a, b) => b.credibility - a.credibility);

  // Log summary
  console.log("[Search] Source summary:");
  for (const [type, count] of Object.entries(sourceCounts)) {
    console.log(`  - ${type}: ${count} results`);
  }
  console.log(`[Search] Total: ${deduped.length} results after deduplication`);
  
  if (warnings.length > 0) {
    console.warn("[Search] Warnings:", warnings);
  }

  return {
    results: deduped,
    sourceBuckets,
    sourceCounts,
    totalUsed: deduped.length,
    warnings,
  };
}
```

**Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/search/aggregator.ts
git commit -m "feat(search): implement per-source bucket ranking with top 20 each"
```

---

## Task 6: Update Generator Progress Messages

**Files:**
- Modify: `src/lib/wiki/generator.ts:43-66`

**Step 1: Enhance progress messages with source breakdown**

In `src/lib/wiki/generator.ts`, replace lines 43-66:

```typescript
    onProgress?.({ stage: "searching", message: "正在搜索相关信息...", progress: 5 });

    // Run aggregated search (pass both Tavily and GLM5 keys)
    const searchResult = await aggregatedSearch(topic, tavilyApiKey, apiKey);
    const searchResultList = searchResult.results;

    // Build detailed source summary
    const bucketSummary = Object.entries(searchResult.sourceBuckets)
      .map(([key, bucket]) => {
        const count = bucket.results.length;
        const status = bucket.success ? "✓" : "✗";
        return `${bucket.sourceName}: ${count}条 ${status}`;
      })
      .join(" | ");
    
    // Log source diversity info
    console.log("[Generator] Sources used:", Object.keys(searchResult.sourceCounts));
    console.log("[Generator] Source counts:", searchResult.sourceCounts);
    
    // Build progress message
    let progressMessage = `搜索完成 | ${bucketSummary}`;
    if (searchResult.warnings.length > 0) {
      progressMessage += `\n⚠️ ${searchResult.warnings.join('\n⚠️ ')}`;
    }
    
    onProgress?.({ 
      stage: "searching", 
      message: progressMessage, 
      progress: 15 
    });
```

**Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/wiki/generator.ts
git commit -m "feat(generator): add detailed source breakdown to progress messages"
```

---

## Task 7: Update Wiki Response with Source Metadata

**Files:**
- Modify: `src/lib/wiki/generator.ts:105-119`

**Step 1: Include per-source bucket data in wiki record**

In `src/lib/wiki/generator.ts`, replace lines 105-119:

```typescript
    // Update wiki record with enhanced source metadata
    const sourceMetadata = Object.entries(searchResult.sourceBuckets).map(([key, bucket]) => ({
      sourceType: bucket.sourceType,
      sourceName: bucket.sourceName,
      count: bucket.results.length,
      success: bucket.success,
      error: bucket.error,
      topResults: bucket.results.slice(0, 3).map(r => ({
        title: r.title,
        url: r.url,
        credibility: r.credibility,
      })),
    }));

    await db
      .update(wikis)
      .set({
        knowledgeType,
        status: "ready",
        markdown: fullMarkdown,
        sources: materialPackage.searchResults.map((r) => ({
          sourceType: r.sourceType,
          sourceName: r.sourceName,
          url: r.url,
          title: r.title,
          credibility: r.credibility,
        })),
        sourceMetadata: JSON.stringify(sourceMetadata),
        sourceWarnings: JSON.stringify(searchResult.warnings),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(wikis.id, wikiId));
```

**Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: May have errors about missing columns in schema (will fix in Task 8)

---

## Task 8: Add Source Metadata Columns to Database Schema

**Files:**
- Modify: `src/lib/db/schema.ts`

**Step 1: Add sourceMetadata and sourceWarnings columns to wikis table**

In `src/lib/db/schema.ts`, add to the wikis table definition:

```typescript
// In wikis table, after sources field:
sourceMetadata: sqliteText("source_metadata"),  // JSON: per-source bucket data
sourceWarnings: sqliteText("source_warnings"),  // JSON: array of warning strings
```

**Step 2: Run database push**

Run: `npm run db:push`
Expected: Schema updated successfully

**Step 3: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/lib/db/schema.ts src/lib/wiki/generator.ts
git commit -m "feat(db): add sourceMetadata and sourceWarnings to wikis table"
```

---

## Task 9: Build and Test

**Files:**
- None (verification task)

**Step 1: Run build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 2: Run dev server and test manually**

Run: `npm run dev`

Test with a topic and verify:
1. Progress message shows source breakdown
2. Empty sources show warnings
3. Wiki generates successfully

**Step 3: Commit if any fixes needed**

```bash
git add .
git commit -m "fix: resolve build issues"
```

---

## Verification Checklist

After all tasks complete, verify:

- [ ] All adapters return up to 20 results (LLM: 1)
- [ ] Aggregator creates per-source buckets
- [ ] Each bucket sorted by credibility, top 20 taken
- [ ] Empty sources generate warnings, not errors
- [ ] Failed sources show error messages
- [ ] Progress message displays source breakdown
- [ ] Wiki record includes sourceMetadata
- [ ] Build passes
- [ ] No TypeScript errors
- [ ] Manual test succeeds

---

## Summary

**Files Modified:**
- `src/lib/search/types.ts` - Add SourceBucket, AggregatedSearchResult types
- `src/lib/search/tavily.ts` - max_results: 10 → 20
- `src/lib/search/semantic-scholar.ts` - limit: "10" → "20"
- `src/lib/search/arxiv.ts` - max_results: "10" → "20"
- `src/lib/search/aggregator.ts` - Complete rewrite with bucket logic
- `src/lib/wiki/generator.ts` - Enhanced progress messages, source metadata
- `src/lib/db/schema.ts` - Add sourceMetadata, sourceWarnings columns

**Total Commits:** 9

**Estimated Time:** 30-45 minutes
