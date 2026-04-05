import type { CredibilityScore, InfoType } from "@/types";
import type { SearchAdapter, RawSearchResult } from "./types";
import { containsChinese, translateToEnglish } from "./translate";
import type { SourceType } from "@/types";

const S2_API_URL = "https://api.semanticscholar.org/graph/v1/paper/search";
const TIMEOUT_MS = 30_000; // Increased timeout for better reliability

interface S2Paper {
  paperId: string;
  title?: string;
  abstract?: string;
  citationCount?: number;
  authors?: Array<{ name: string }>;
  url?: string;
  year?: number;
}

export class SemanticScholarAdapter implements SearchAdapter {
  name = "Semantic Scholar";
  sourceType = "academic" as const;

  private apiKey: string | null;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GLM5_API_KEY || null;
  }

  async search(query: string): Promise<RawSearchResult[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      // Use dynamic LLM translation for Chinese queries
      let englishQuery = query;
      let isTranslated = false
      
      if (this.apiKey && containsChinese(query)) {
        englishQuery = await translateToEnglish(query, this.apiKey)
        isTranslated = englishQuery !== query
        console.log(`[Semantic Scholar] Translated: "${query}" -> "${englishQuery}"`)
      }
      
      console.log(`[Semantic Scholar] Searching for: ${query}${isTranslated ? ` (translated)` : ''}`)
      
      const params = new URLSearchParams({
        query: englishQuery,
        limit: "20",
        fields: "title,abstract,citationCount,authors,url,year",
      });

      let response = await fetch(`${S2_API_URL}?${params}`, {
        signal: controller.signal,
      });

      if (!response.ok) {
        // Handle rate limiting (429) gracefully
        if (response.status === 429) {
          console.warn("[Semantic Scholar] Rate limited (429), skipping...");
          return [];
        }
        throw new Error(
          `Semantic Scholar API error: ${response.status} ${response.statusText}`
        );
      }

      let data = (await response.json()) as { data: S2Paper[] };
      let papers = data.data || [];
      
      // If no results with translated query and try original
      if (papers.length === 0 && isTranslated) {
        console.warn("[Semantic Scholar] No results with English translation, trying original query...");
        
        const fallbackParams = new URLSearchParams({
          query: query,
          limit: "20",
          fields: "title,abstract,citationCount,authors,url,year",
        });
        
        const fallbackResponse = await fetch(`${S2_API_URL}?${fallbackParams}`, {
          signal: controller.signal,
        });
        
        if (fallbackResponse.ok) {
          const fallbackData = (await fallbackResponse.json()) as { data: S2Paper[] };
          papers = fallbackData.data || [];
        }
      }

      console.log(`[Semantic Scholar] Found ${papers.length} results`);

      return papers
        .filter((p) => p.title)
        .map((paper) => ({
          title: paper.title || "",
          url: paper.url || `https://semanticscholar.org/paper/${paper.paperId}`,
          snippet: paper.abstract?.slice(0, 500) || "",
          credibility: 5 as CredibilityScore,
          infoType: (paper.abstract ? "principle" : "definition") as InfoType,
          metadata: {
            citationCount: paper.citationCount,
            authors: paper.authors?.map((a) => a.name),
            year: paper.year,
          },
        }));
    } catch (error) {
      console.error("[Semantic Scholar] Search failed:", error);
      return [];
    } finally {
      clearTimeout(timer)
    }
  }
}
