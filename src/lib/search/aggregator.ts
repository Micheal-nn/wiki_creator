import type { SearchResult, SourceType } from "@/types";
import type { SearchAdapter, RawSearchResult, SourceBucket, AggregatedSearchResult } from "./types";
import { TavilyAdapter } from "./tavily";
import { SemanticScholarAdapter } from "./semantic-scholar";
import { ArxivAdapter } from "./arxiv";
import { LLMAdapter } from "./llm";

const MAX_PER_SOURCE = 20;
const MIN_SOURCES_REQUIRED = 3; // At least 3 out of 4 sources must have data
const MAX_RETRIES = 1; // Retry once if source returns empty

// Helper function to search with retry
async function searchWithRetry(
  adapter: SearchAdapter,
  topic: string,
  sourceName: string,
  maxRetries: number = MAX_RETRIES
): Promise<{ results: RawSearchResult[]; error?: string }> {
  let lastError: string | undefined;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`[Search] ${sourceName} retry attempt ${attempt}...`);
        // Add a small delay before retry
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      const results = await adapter.search(topic);
      
      // If we got results, return them
      if (results.length > 0) {
        return { results };
      }
      
      // Empty results - will retry if we have attempts left
      if (attempt < maxRetries) {
        console.log(`[Search] ${sourceName} returned empty, will retry...`);
        lastError = '无相关结果';
      } else {
        return { results: [], error: '无相关结果 (已重试)' };
      }
    } catch (error) {
      lastError = String(error);
      if (attempt >= maxRetries) {
        console.error(`[Search] ${sourceName} failed after ${maxRetries + 1} attempts:`, error);
        return { results: [], error: lastError };
      }
    }
  }
  
  return { results: [], error: lastError || '未知错误' };
}

export async function aggregatedSearch(
  topic: string,
  tavilyApiKey?: string,
  glm5ApiKey?: string
): Promise<AggregatedSearchResult> {
  console.log("[Search] Starting aggregated search for:", topic);

  // Initialize adapters with metadata - pass GLM5 API key to academic adapters for translation
  const adapterConfigs = [
    { 
      adapter: new TavilyAdapter(tavilyApiKey), 
      key: 'tavily' as const,
      sourceType: 'general' as SourceType,
      sourceName: 'Tavily'
    },
    { 
      adapter: new SemanticScholarAdapter(glm5ApiKey), 
      key: 'semanticScholar' as const,
      sourceType: 'academic' as SourceType,
      sourceName: 'Semantic Scholar'
    },
    { 
      adapter: new ArxivAdapter(glm5ApiKey), 
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
  
  // Initialize per-source buckets
  const sourceBuckets: AggregatedSearchResult['sourceBuckets'] = {
    tavily: { sourceType: 'general' as SourceType, sourceName: 'Tavily', results: [], success: true },
    semanticScholar: { sourceType: 'academic' as SourceType, sourceName: 'Semantic Scholar', results: [], success: true },
    arxiv: { sourceType: 'academic' as SourceType, sourceName: 'arXiv', results: [], success: true },
    llm: { sourceType: 'llm' as SourceType, sourceName: 'GLM5 知识库', results: [], success: true },
  };
  
  // Fetch from all sources in parallel with retry logic
  const fetchResults = await Promise.all(
    adapterConfigs.map(async ({ adapter, key, sourceType, sourceName }) => {
      console.log(`[Search] Calling ${sourceName}...`);
      const startTime = Date.now();
      
      const { results, error } = await searchWithRetry(adapter, topic, sourceName);
      const duration = Date.now() - startTime;
      
      const success = results.length > 0;
      
      if (success) {
        console.log(`[Search] ${sourceName} returned ${results.length} results in ${duration}ms`);
      } else {
        console.warn(`[Search] ${sourceName} returned no results in ${duration}ms: ${error}`);
      }
      
      return { 
        key, 
        results, 
        success, 
        error: success ? undefined : error,
        sourceType, 
        sourceName 
      };
    })
  );
  
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
      warnings.push(`${sourceName}: ${error || 'API 错误'}`);
    } else if (topResults.length === 0) {
      warnings.push(`${sourceName}: 无相关结果`);
    }
  }
  
  // Validate: at least 3 out of 4 sources must have data
  const successCount = Object.values(sourceBuckets).filter(b => b.results.length > 0).length;
  console.log(`[Search] Sources with data: ${successCount}/4`);
  
  if (successCount < MIN_SOURCES_REQUIRED) {
    const failedSources = Object.values(sourceBuckets)
      .filter(b => b.results.length === 0)
      .map(b => `${b.sourceName}: ${b.error || '无结果'}`)
      .join(', ');
    
    const errorMsg = `数据源不足: 仅 ${successCount}/4 个数据源有数据 (需要至少 ${MIN_SOURCES_REQUIRED}/4)。失败来源: ${failedSources}`;
    console.error(`[Search] ${errorMsg}`);
    warnings.unshift(`⚠️ ${errorMsg}`);
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
