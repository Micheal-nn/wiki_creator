import type { CredibilityScore, InfoType } from "@/types";
import type { SearchAdapter, RawSearchResult } from "./types";

import type { SourceType } from "@/types";

const ARXIV_API_URL = "http://export.arxiv.org/api/query";
const TIMEOUT_MS = 15_000;

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

  async search(query: string): Promise<RawSearchResult[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      // First try the original query (supports Chinese)
      const params = new URLSearchParams({
        search_query: `all:${query}`,
        start: "0",
        max_results: "20",
        sortBy: "relevance",
        sortOrder: "descending",
      });
      
      console.log(`[arXiv] Searching for: ${query}`);
      let response = await fetch(`${ARXIV_API_URL}?${params}`, {
        signal: controller.signal,
      });
      
      if (!response.ok) {
        // If query fails, try English translation
        if (response.status === 404 || response.status >= 500) {
          console.warn(`[arXiv] Chinese query failed (${response.status}), trying English fallback...`);
          
          // Simple translation for common terms
          const englishQuery = translateToEnglish(query);
          const fallbackParams = new URLSearchParams({
            search_query: `all:${englishQuery}`,
            start: "0",
            max_results: "20",
            sortBy: "relevance",
            sortOrder: "descending",
          });
          
          const fallbackResponse = await fetch(`${ARXIV_API_URL}?${fallbackParams}`, {
            signal: controller.signal,
          });
          
          if (!fallbackResponse.ok) {
            throw new Error(`arXiv API error: ${fallbackResponse.status}`);
          }
          
          const data = await fallbackResponse.text();
          const entries = parseArxivXml(data);
          console.log(`[arXiv] Found ${entries.length} results (English fallback)`);
          
          return entries.map((entry) => ({
            title: entry.title,
            url: entry.id,
            snippet: entry.summary.slice(0, 500),
            credibility: 4 as CredibilityScore,
            infoType: "principle" as InfoType,
            metadata: { authors: entry.authors },
          }));
        }
        
        throw new Error(`arXiv API error: ${response.status}`);
      }
      
      // Parse XML from successful response
      const data = await response.text();
      const entries = parseArxivXml(data);
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
      clearTimeout(timer);
    }
  }
}

// Simple translation helper for common Chinese terms
function translateToEnglish(query: string): string {
  const translations: Record<string, string> = {
    "量子计算": "quantum computing",
    "量子力学": "quantum mechanics",
    "机器学习": "machine learning",
    "深度学习": "deep learning",
    "人工智能": "artificial intelligence",
    "神经网络": "neural network",
    "区块链": "blockchain",
    "云计算": "cloud computing",
    "大数据": "big data",
    "物联网": "internet of things",
    "自然语言处理": "natural language processing",
    "计算机视觉": "computer vision",
  };
  
  // Check if query contains any known Chinese term
  for (const [chinese, english] of Object.entries(translations)) {
    if (query.includes(chinese)) {
      return english;
    }
  }
  
  // Default: return as-is (might work for some queries)
  return query;
}
