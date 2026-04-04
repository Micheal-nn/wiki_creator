// Knowledge type classification
export type KnowledgeType =
  | "mathematical"    // 数学原理型
  | "physical"        // 物理原理型
  | "architectural"   // 架构/系统型
  | "logical"         // 逻辑/算法型
  | "conceptual"      // 概念/理论型
  | "practical";      // 实践/工具型

// Pyramid layer levels
export type LayerLevel = 1 | 2 | 3 | 4;

// Search source types
export type SourceType = "academic" | "technical" | "general" | "llm";

// Info types for search results
export type InfoType =
  | "definition"
  | "principle"
  | "analogy"
  | "application"
  | "misconception";

// Credibility score (1-5)
export type CredibilityScore = 1 | 2 | 3 | 4 | 5;

// Chart types
export type ChartType =
  | "mermaid"
  | "infographic"
  | "ai-image"
  | "table"
  | "mindmap";

// Wiki generation status
export type WikiStatus = "draft" | "generating" | "ready" | "error";

// Structured search result
export interface SearchResult {
  sourceType: SourceType;
  sourceName: string;
  url: string;
  title: string;
  snippet: string;
  credibility: CredibilityScore;
  infoType: InfoType;
}

// Structured material package (output of Step 1)
export interface MaterialPackage {
  topic: string;
  searchResults: SearchResult[];
  llmSupplement: string;
  llmSupplementAreas: string[];
}

// Wiki section (one layer block)
export interface WikiSection {
  layer: LayerLevel;
  title: string;
  markdown: string;
  imageInstructions: ChartInstruction[];
}

// Chart generation instruction
export interface ChartInstruction {
  type: ChartType;
  description: string;
  mermaidCode?: string;
  templateData?: Record<string, string>;
}

// Wiki generation progress
export interface GenerationProgress {
  stage:
    | "searching"
    | "filtering"
    | "fusing"
    | "classifying"
    | "generating"
    | "rendering-charts"
    | "reviewing"
    | "done"
    | "error";
  message: string;
  progress: number; // 0-100
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
