import type { SearchResult } from "@/types";
import type { SearchAdapter, RawSearchResult } from "./types";
import { TavilyAdapter } from "./tavily";
import { SemanticScholarAdapter } from "./semantic-scholar";
import { ArxivAdapter } from "./arxiv";
import { LLMAdapter } from "./llm";

export interface SourceDiversityResult {
  results: SearchResult[];
  sourceCounts: Record<string, number>;
  sourcesUsed: string[];
  diversityWarning?: string;
}

export async function aggregatedSearch(
  topic: string,
  tavilyApiKey?: string,
  glm5ApiKey?: string
): Promise<SourceDiversityResult> {
  console.log("[Search] Starting aggregated search for:", topic);

  const adapters: SearchAdapter[] = [
    new TavilyAdapter(tavilyApiKey),
    new SemanticScholarAdapter(),
    new ArxivAdapter(),
    new LLMAdapter(glm5ApiKey),
  ];

  console.log("[Search] Adapters initialized:", adapters.map(a => a.name));

  // Track which sources succeed
  const sourceStatus: Record<string, { success: boolean; count: number; error?: string }> = {};

  const results = await Promise.allSettled(
    adapters.map(async (adapter) => {
      console.log(`[Search] Calling ${adapter.name}...`);
      const startTime = Date.now();
      try {
        const raw = await adapter.search(topic);
        const duration = Date.now() - startTime;
        console.log(`[Search] ${adapter.name} returned ${raw.length} results in ${duration}ms`);
        sourceStatus[adapter.sourceType] = { success: true, count: raw.length };
        return raw.map(
          (r): SearchResult => ({
            sourceType: adapter.sourceType,
            sourceName: adapter.name,
            url: r.url,
            title: r.title,
            snippet: r.snippet,
            credibility: r.credibility,
            infoType: r.infoType,
          })
        );
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[Search] ${adapter.name} failed after ${duration}ms:`, error);
        sourceStatus[adapter.sourceType] = { 
          success: false, 
          count: 0, 
          error: String(error) 
        };
        throw error;
      }
    })
  );

  const allResults: SearchResult[] = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const adapterName = adapters[i].name;
    if (result.status === "fulfilled") {
      console.log(`[Search] ${adapterName}: ${result.value.length} results added`);
      allResults.push(...result.value);
    } else {
      console.error(`[Search] ${adapterName} failed:`, result.reason);
    }
  }

  // Calculate source diversity
  const sourceCounts: Record<string, number> = {};
  for (const result of allResults) {
    sourceCounts[result.sourceType] = (sourceCounts[result.sourceType] || 0) + 1;
  }

  const sourcesUsed = Object.keys(sourceCounts);
  const successfulSources = Object.entries(sourceStatus)
    .filter(([_, status]) => status.success)
    .map(([type]) => type);

  // Diversity validation: require at least 3 sources
  const MIN_SOURCES = 3;
  const REQUIRED_SOURCES = ["general", "academic", "preprint", "llm"];
  
  let diversityWarning: string | undefined;
  
  if (successfulSources.length < MIN_SOURCES) {
    const failedSources = Object.entries(sourceStatus)
      .filter(([_, status]) => !status.success)
      .map(([type]) => `${type} (${sourceStatus[type].error || 'unknown error'})`);
    
    diversityWarning = `⚠️ Source diversity warning: Only ${successfulSources.length} sources succeeded. ` +
      `Failed sources: ${failedSources.join(", ")}. ` +
      `Wiki quality may be affected.`;
    
    console.warn("[Search]", diversityWarning);
  }

  // Log source summary
  console.log("[Search] Source summary:");
  for (const [type, count] of Object.entries(sourceCounts)) {
    console.log(`  - ${type}: ${count} results`);
  }
  console.log(`[Search] Total: ${allResults.length} results from ${sourcesUsed.length} sources`);

  // Deduplicate by URL
  const seen = new Set<string>();
  const deduped = allResults.filter((r) => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });

  // Sort by credibility descending
  return {
    results: deduped.sort((a, b) => b.credibility - a.credibility),
    sourceCounts,
    sourcesUsed,
    diversityWarning,
  };
}
