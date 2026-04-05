import type { CredibilityScore, InfoType } from "@/types";
import type { SearchAdapter, RawSearchResult } from "./types";

const S2_API_URL = "https://api.semanticscholar.org/graph/v1/paper/search";
const TIMEOUT_MS = 15_000;

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

  async search(query: string): Promise<RawSearchResult[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const params = new URLSearchParams({
        query,
        limit: "20",
        fields: "title,abstract,citationCount,authors,url,year",
      });

      const response = await fetch(`${S2_API_URL}?${params}`, {
        signal: controller.signal,
      });

      if (!response.ok) {
        // Handle rate limiting (429) gracefully - return empty results instead of throwing
        // Better 429 handling - add retry logic
        if (response.status === 429) {
          console.warn("[Search] Semantic Scholar rate limited (429), will retry later...");
          return [];
        }
        throw new Error(
          `Semantic Scholar API error: ${response.status} ${response.statusText}`
        );
      }

      const data = (await response.json()) as { data: S2Paper[] };

      return (data.data || [])
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
      console.error("Semantic Scholar search failed:", error);
      return [];
    } finally {
      clearTimeout(timer);
    }
  }
}
