# Multi-Source Data Ranking Design

**Date**: 2026-04-05
**Status**: Approved
**Approach**: Per-Source Bucket Ranking

## Goal

Enforce strict multi-source data requirements: each wiki must reference data from Tavily (general), Semantic Scholar (academic), arXiv (preprints), and LLM database. Each source contributes up to 20 results, ranked by credibility within the source. Maximum 80 total references per wiki.

## Requirements

1. **Four mandatory data sources**: Tavily, Semantic Scholar, arXiv, LLM
2. **Per-source limit**: Top 20 results per source, ranked by credibility
3. **Empty sources shown honestly**: "arXiv: 无相关预印本论文" not hidden
4. **Failed sources shown with error**: "Semantic Scholar: API 限流，已跳过"
5. **Maximum 80 total references** per wiki

## Architecture

### Data Flow

```
Topic → [4 Adapters in parallel]
         ↓
    [Per-Source Buckets]
         ↓
    [Sort by credibility → Top 20 each]
         ↓
    [Merge → Dedupe → Global sort]
         ↓
    [Final pool: max 80 results]
```

### Type Definitions

**File**: `src/lib/search/types.ts`

```typescript
// Per-source result bucket
export interface SourceBucket {
  sourceType: SourceType;
  sourceName: string;
  results: RawSearchResult[];
  success: boolean;
  error?: string;
}

// Enhanced aggregation result
export interface AggregatedSearchResult {
  // Final merged results (max 80, top 20 per source)
  results: SearchResult[];
  
  // Per-source breakdown for transparency
  sourceBuckets: {
    tavily: SourceBucket;
    semanticScholar: SourceBucket;
    arxiv: SourceBucket;
    llm: SourceBucket;
  };
  
  // Summary counts
  sourceCounts: Record<string, number>;
  totalUsed: number;
  
  // Warnings for empty/failed sources
  warnings: string[];
}
```

## Component Changes

### 1. Adapter Fetch Limits

| Adapter | File | Current | Change |
|---------|------|---------|--------|
| Tavily | `src/lib/search/tavily.ts` | `max_results: 10` | `max_results: 20` |
| Semantic Scholar | `src/lib/search/semantic-scholar.ts` | `limit: "10"` | `limit: "20"` |
| arXiv | `src/lib/search/arxiv.ts` | `max_results: "10"` | `max_results: "20"` |
| LLM | `src/lib/search/llm.ts` | 1 result | No change |

### 2. Aggregator Logic

**File**: `src/lib/search/aggregator.ts`

**New behavior**:
1. Initialize 4 adapters with keys
2. Fetch from all sources in parallel
3. Build per-source buckets with success/error tracking
4. Sort each bucket by credibility → top 20
5. Generate warnings for empty/failed sources
6. Merge all buckets → deduplicate by URL → global sort
7. Return `AggregatedSearchResult` with full breakdown

**Warning messages**:
- Empty source: `${sourceName}: 无相关结果`
- API error: `${sourceName}: API 错误 (${error})`
- API key missing: `${sourceName}: API Key 未配置`
- Rate limited: `${sourceName}: API 限流，已跳过`

### 3. Wiki Generator

**File**: `src/lib/wiki/generator.ts`

**Changes**:
- Enhanced progress messages with source breakdown
- Pass bucket data to wiki record
- Include warnings in progress updates

**Example progress message**:
```
搜索完成 | Tavily: 18条 | Semantic Scholar: 20条 | arXiv: 0条 | GLM5: 1条
⚠️ arXiv: 无相关预印本论文
```

### 4. Wiki Sources API

**File**: `src/app/api/wikis/[id]/route.ts`

**Changes**:
- Include per-source bucket metadata in wiki response
- Sample top 3 results per source for preview

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Network failure | Source returns `[]`, warning added |
| Rate limit (429) | Source returns `[]`, warning added |
| API key missing | Source throws error, caught as warning |
| All sources empty | Continue with empty results, show warnings |
| All sources fail | Continue, wiki will be LLM-only or minimal |

## UI Display

### During Generation
```
搜索中...
搜索完成 | Tavily: 18条 | Semantic Scholar: 20条 | arXiv: 0条 | GLM5: 1条
⚠️ arXiv: 无相关预印本论文
正在分析资料...
```

### Wiki Sources Page
```
数据来源
├── Tavily (通用搜索) ──── 18条 ✓
├── Semantic Scholar (学术) ─ 20条 ✓
├── arXiv (预印本) ─────── 0条 ⚠️ 无相关预印本论文
└── GLM5 知识库 ────────── 1条 ✓

总计: 39 条参考来源
```

## Implementation Order

1. Update type definitions (`types.ts`)
2. Update adapter limits (tavily, semantic-scholar, arxiv)
3. Rewrite aggregator with bucket logic (`aggregator.ts`)
4. Update generator with enhanced messaging (`generator.ts`)
5. Update wiki API response format (`route.ts`)
6. Test with various topics to verify behavior

## Success Criteria

- [ ] All 4 adapters return up to 20 results (LLM: 1)
- [ ] Per-source ranking works correctly
- [ ] Empty sources show warning, not error
- [ ] Failed sources show error message
- [ ] Wiki generation continues even if some sources fail
- [ ] UI displays source breakdown accurately
- [ ] Build passes
- [ ] No TypeScript errors
