import type { SourceType, InfoType, CredibilityScore, SearchResult } from "@/types";

export interface SearchAdapter {
  name: string;
  sourceType: SourceType;
  search(query: string): Promise<RawSearchResult[]>;
}

export interface RawSearchResult {
  title: string;
  url: string;
  snippet: string;
  credibility: CredibilityScore;
  infoType: InfoType;
  metadata?: Record<string, unknown>;
}

// Per-source result bucket for transparency
export interface SourceBucket {
  sourceType: SourceType;
  sourceName: string;
  results: RawSearchResult[];
  success: boolean;
  error?: string;
}

// Enhanced aggregation result with per-source breakdown
export interface AggregatedSearchResult {
  // Final merged results (max 80, top 20 per source)
  results: SearchResult[];
  
  // Per-source breakdown for UI transparency
  sourceBuckets: {
    tavily: SourceBucket;
    semanticScholar: SourceBucket;
    arxiv: SourceBucket;
    llm: SourceBucket;
  };
  
  // Summary counts per source type
  sourceCounts: Record<string, number>;
  
  // Total results used (after dedup)
  totalUsed: number;
  
  // Warnings for empty/failed sources
  warnings: string[];
}
