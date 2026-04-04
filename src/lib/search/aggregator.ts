import type { SearchResult } from "@/types";
import type { SearchAdapter, RawSearchResult } from "./types";
import { TavilyAdapter } from "./tavily";
import { SemanticScholarAdapter } from "./semantic-scholar";
import { ArxivAdapter } from "./arxiv";
import { LLMAdapter } from "./llm";

export async function aggregatedSearch(
  topic: string,
  tavilyApiKey?: string,
  glm5ApiKey?: string
): Promise<SearchResult[]> {
  console.log("[Search] Starting aggregated search for:", topic);
  
  const adapters: SearchAdapter[] = [
    new TavilyAdapter(tavilyApiKey),
    new SemanticScholarAdapter(),
    new ArxivAdapter(),
    new LLMAdapter(glm5ApiKey),
  ];

  console.log("[Search] Adapters initialized:", adapters.map(a => a.name));

  const results = await Promise.allSettled(
    adapters.map(async (adapter) => {
      console.log(`[Search] Calling ${adapter.name}...`);
      const startTime = Date.now();
      try {
        const raw = await adapter.search(topic);
        const duration = Date.now() - startTime;
        console.log(`[Search] ${adapter.name} returned ${raw.length} results in ${duration}ms`);
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

  // Deduplicate by URL
  const seen = new Set<string>();
  const deduped = allResults.filter((r) => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });

  // Sort by credibility descending
  return deduped.sort((a, b) => b.credibility - a.credibility);
}
