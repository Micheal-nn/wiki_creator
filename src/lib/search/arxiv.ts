import type { CredibilityScore, InfoType } from "@/types";
import type { SearchAdapter, RawSearchResult } from "./types";

const ARXIV_API_URL = "http://export.arxiv.org/api/query";
const TIMEOUT_MS = 15_000;

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
  sourceType = "academic" as const;

  async search(query: string): Promise<RawSearchResult[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const params = new URLSearchParams({
        search_query: `all:${query}`,
        start: "0",
        max_results: "10",
        sortBy: "relevance",
        sortOrder: "descending",
      });

      const response = await fetch(`${ARXIV_API_URL}?${params}`, {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`arXiv API error: ${response.status}`);
      }

      const xml = await response.text();
      const entries = parseArxivXml(xml);

      return entries.map((entry) => ({
        title: entry.title,
        url: entry.id,
        snippet: entry.summary.slice(0, 500),
        credibility: 4 as CredibilityScore,
        infoType: "principle" as InfoType,
        metadata: { authors: entry.authors },
      }));
    } catch (error) {
      console.error("arXiv search failed:", error);
      return [];
    } finally {
      clearTimeout(timer);
    }
  }
}
