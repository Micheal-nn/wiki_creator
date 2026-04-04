import type { SourceType, InfoType, CredibilityScore } from "@/types";

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

// Per-source results bucket for multi-source aggregation
export interface SourceBucket {
  // The source type this bucket represents (e.g. "general", "academic", etc.)
  source: SourceType;
  // The list of raw search results from this source
  results: RawSearchResult[];
  // Optional total count of results from this source if the API provides it
  total?: number;
}

// Aggregated search result structure that combines multiple SourceBuckets
export interface AggregatedSearchResult {
  // Original query for which results were gathered
  query: string;
  // Total number of results across all sources (if available)
  total?: number;
  // Buckets of per-source results
  buckets: SourceBucket[];
  // Optional best/featured result across buckets
  topResult?: RawSearchResult;
}
