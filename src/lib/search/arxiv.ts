import type { CredibilityScore, InfoType } from "@/types";
import type { SearchAdapter, RawSearchResult } from "./types";
import { containsChinese, translateToEnglish } from "./translate";

import type { SourceType } from "@/types";

const ARXIV_API_URL = "https://export.arxiv.org/api/query";
const TIMEOUT_MS = 30_000; // 30 seconds timeout

const MAX_PER_SOURCE = 20;

interface ArxivEntry {
  title: string;
  summary: string;
  id: string;
  authors: string[];
}

function parseArxivXml(xml: string): ArxivEntry[] {
  const entries: ArxivEntry[] = [];
  const entryBlocks = xml.split("<entry>");

  for (let i = 1; i < entryBlocks.length; i++) {
    const block = entryBlocks[i];
    if (!block) continue;

    // Extract title
    const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/);
    const title = titleMatch?.[1]?.replace(/\s+/g, " ").trim() || "";

    // Extract summary
    const summaryMatch = block.match(/<summary>([\s\S]*?)<\/summary>/);
    const summary = summaryMatch?.[1]?.replace(/\s+/g, " ").trim() || "";

    // Extract ID (URL)
    const idMatch = block.match(/<id>([\s\S]*?)<\/id>/);
    const id = idMatch?.[1]?.trim() || "";

    // Extract authors
    const authorMatches = block.matchAll(/<name>([\s\S]*?)<\/name>/g);
    const authors = Array.from(authorMatches).map((m) => m[1]?.trim() || "");

    if (title) {
      entries.push({ title, summary, id, authors });
    }
  }

  return entries;
}

export class ArxivAdapter implements SearchAdapter {
  name = "arXiv";
  sourceType: SourceType = "academic";

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
        console.log(`[arXiv] Translated: "${query}" -> "${englishQuery}"`)
      }
      
      console.log(`[arXiv] Searching for: ${query}${isTranslated ? ` (translated)` : ''}`);
      
      const params = new URLSearchParams({
        search_query: `all:${englishQuery}`,
        start: "0",
        max_results: "20",
        sortBy: "relevance",
        sortOrder: "descending",
      });
      
      let response = await fetch(`${ARXIV_API_URL}?${params}`, {
        signal: controller.signal,
      });
      
      // Handle HTTP errors
      if (!response.ok) {
        throw new Error(`arXiv API error: ${response.status}`);
      }
      
      // Parse XML
      const data = await response.text();
      let entries = parseArxivXml(data);
      
      // If no results with translated query, try original Chinese query
      if (entries.length === 0 && isTranslated) {
        console.warn(`[arXiv] No results with English translation, trying original query...`);
        
        const fallbackParams = new URLSearchParams({
          search_query: `all:${query}`,
          start: "0",
          max_results: "20",
          sortBy: "relevance",
          sortOrder: "descending",
        });
        
        const fallbackResponse = await fetch(`${ARXIV_API_URL}?${fallbackParams}`, {
          signal: controller.signal,
        });
        
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.text();
          entries = parseArxivXml(fallbackData);
        }
      }
      
      console.log(`[arXiv] Found ${entries.length} results`);
      
      return entries.map((entry) => ({
        title: entry.title,
        url: entry.id,
        snippet: entry.summary.slice(0, 500),
        credibility: 4 as CredibilityScore,
        infoType: "principle" as InfoType,
        metadata: { authors: entry.authors },
      }));
    } catch (error) {
      console.error("[arXiv] Search failed:", error);
      return [];
    } finally {
      clearTimeout(timer)
    }
  }
}
