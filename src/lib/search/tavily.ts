import type { SourceType, InfoType, CredibilityScore } from "@/types";
import type { SearchAdapter, RawSearchResult } from "./types";

const TAVILY_API_URL = "https://api.tavily.com/search";
const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 2;

async function fetchWithRetry(
  url: string,
  body: unknown,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
  retries: number = MAX_RETRIES
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (response.status === 429 && attempt < retries) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      if (!response.ok) {
        throw new Error(`Tavily API error: ${response.status} ${response.statusText}`);
      }

      return response;
    } catch (error) {
      if (attempt >= retries) throw error;
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise((r) => setTimeout(r, delay));
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error("Tavily API: max retries exceeded");
}

export class TavilyAdapter implements SearchAdapter {
  name = "Tavily";
  sourceType: SourceType = "general";
  private apiKey: string | null = null;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.TAVILY_API_KEY || null;
  }

  async search(query: string): Promise<RawSearchResult[]> {
    if (!this.apiKey) {
      console.warn("TAVILY_API_KEY not set, skipping Tavily search");
      return [];
    }

    const response = await fetchWithRetry(TAVILY_API_URL, {
      api_key: this.apiKey,
      query,
      search_depth: "advanced",
      max_results: 10,
      include_answer: false,
    });

    const data = (await response.json()) as {
      results: Array<{
        title: string;
        url: string;
        content: string;
        score: number;
      }>;
    };

    return (data.results || []).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.content?.slice(0, 500) || "",
      credibility: 3 as CredibilityScore,
      infoType: "definition" as InfoType,
      metadata: { score: r.score },
    }));
  }
}
