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
