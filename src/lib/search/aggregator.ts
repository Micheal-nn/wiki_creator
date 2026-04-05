import type { SearchResult, SourceType } from "@/types";
import type { SearchAdapter, RawSearchResult, SourceBucket, AggregatedSearchResult } from "./types";
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

  // Initialize adapters with metadata
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
  
  // Initialize per-source buckets
  const sourceBuckets: AggregatedSearchResult['sourceBuckets'] = {
    tavily: { sourceType: 'general' as SourceType, sourceName: 'Tavily', results: [], success: true },
    semanticScholar: { sourceType: 'academic' as SourceType, sourceName: 'Semantic Scholar', results: [], success: true },
    arxiv: { sourceType: 'academic' as SourceType, sourceName: 'arXiv', results: [], success: true },
    llm: { sourceType: 'llm' as SourceType, sourceName: 'GLM5 知识库', results: [], success: true },
  };
  
  // Populate buckets, sort by credibility, and top 20
  const warnings: string[] = [];
  
  for (const { key, results, success, error, sourceName } of fetchResults) {
    const bucket = sourceBuckets[key];
    bucket.success = success;
    bucket.error = error;
    
    // Sort by credibility descending, take top 20
    const sorted = results.sort((a, b) => b.credibility - a.credibility);
    const topResults = sorted.slice(0, MAX_PER_SOURCE);
    bucket.results = topResults;
    
    // Generate warning for empty/failed sources
    if (!success) {
      warnings.push(`${sourceName}: API 错误 (${error})`);
    } else if (topResults.length === 0) {
      warnings.push(`${sourceName}: 无相关结果`);
    }
  }
  
  // Merge all buckets into final results
  const allResults: SearchResult[] = [];
  const sourceCounts: Record<string, number> = {};
  
  for (const bucket of Object.values(sourceBuckets)) {
    const converted = bucket.results.map(r => ({
      sourceType: bucket.sourceType,
      sourceName: bucket.sourceName,
      url: r.url,
      title: r.title,
      snippet: r.snippet,
      credibility: r.credibility,
      infoType: r.infoType,
    }));
    allResults.push(...converted);
    sourceCounts[bucket.sourceType] = (sourceCounts[bucket.sourceType] || 0) + converted.length;
  }
  
  // Deduplicate by URL and sort globally
  const seen = new Set<string>();
  const deduped = allResults
    .filter(r => {
      if (seen.has(r.url)) return false;
      seen.add(r.url);
      return true;
    })
    .sort((a, b) => b.credibility - a.credibility);
  
  console.log("[Search] Source summary:");
  for (const [type, count] of Object.entries(sourceCounts)) {
    console.log(`  - ${type}: ${count} results`);
  }
  console.log(`[Search] Total: ${deduped.length} results from ${Object.keys(sourceCounts).length} sources`);
  
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
