import type {
  KnowledgeType,
  SearchResult,
  WikiSection,
  GenerationProgress,
  MaterialPackage,
  ChartInstruction,
} from "@/types";
import { chatCompletion, type ChatMessage } from "./client";
import * as prompts from "./prompts";

function parseJsonResponse<T>(content: string, fallback: T): T {
  // Strategy 1: Try to find JSON code block first (```json ... ```)
  const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim()) as T;
    } catch {
      // Continue to other strategies
    }
  }

  // Strategy 2: Find the outermost JSON object/array
  // Handle nested braces properly
  let depth = 0;
  let startIndex = -1;
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\' && inString) {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === '{' || char === '[') {
        if (depth === 0) startIndex = i;
        depth++;
      } else if (char === '}' || char === ']') {
        depth--;
        if (depth === 0 && startIndex >= 0) {
          try {
            const jsonStr = content.slice(startIndex, i + 1);
            return JSON.parse(jsonStr) as T;
          } catch {
            // Continue searching for another JSON
            startIndex = -1;
          }
        }
      }
    }
  }

  // Strategy 3: Try the raw content as a last resort
  try {
    return JSON.parse(content.trim()) as T;
  } catch {
    console.error("Failed to parse LLM JSON response:", content.slice(0, 500));
  }

  return fallback;
}

function parseSectionResponse(
  content: string
): { markdown: string; charts: ChartInstruction[] } {
  // Try to extract CHART_JSON from the end
  const chartMatch = content.match(
    /CHART_JSON:\s*(\{[\s\S]*\})\s*$/
  );

  let markdown = content;
  const charts: ChartInstruction[] = [];

  if (chartMatch) {
    markdown = content.slice(0, content.indexOf("CHART_JSON:")).trim();
    try {
      const chartData = JSON.parse(chartMatch[1]);
      if (chartData.charts && Array.isArray(chartData.charts)) {
        charts.push(...chartData.charts);
      }
    } catch {
      console.error("Failed to parse chart instructions");
    }
  }

  return { markdown, charts };
}

export class Orchestrator {
  private apiKey: string;
  private onProgress?: (progress: GenerationProgress) => void;

  constructor(
    apiKey: string,
    onProgress?: (progress: GenerationProgress) => void
  ) {
    this.apiKey = apiKey;
    this.onProgress = onProgress;
  }

  private progress(
    stage: GenerationProgress["stage"],
    message: string,
    progress: number
  ) {
    this.onProgress?.({ stage, message, progress });
  }

  async filterResults(
    topic: string,
    results: SearchResult[]
  ): Promise<SearchResult[]> {
    this.progress("filtering", "筛选搜索结果...", 20);
    const response = await chatCompletion(
      this.apiKey,
      prompts.searchResultFilter(topic, results),
      { timeout: 120_000 } // 2 minutes for large result sets
    );

    const filterResults = parseJsonResponse<
      { index: number; keep: boolean; credibility: number; infoType: string }[]
    >(response.content, []);

    if (filterResults.length === 0) {
      // Fallback: keep all results with original credibility
      return results;
    }

    return results.filter((_, i) => {
      const filter = filterResults.find((f) => f.index === i);
      return filter ? filter.keep : true;
    });
  }

  async fuseKnowledge(
    topic: string,
    filteredResults: SearchResult[],
    sourceCounts?: Record<string, number>
  ): Promise<MaterialPackage> {
    this.progress("fusing", "融合 LLM 知识...", 35);
    const response = await chatCompletion(
      this.apiKey,
      prompts.knowledgeFusion(topic, filteredResults, sourceCounts)
    );

    const fusionResult = parseJsonResponse<{
      supplement: string;
      blindAreas: string[];
    }>(response.content, { supplement: "", blindAreas: [] });

    return {
      topic,
      searchResults: filteredResults,
      llmSupplement: fusionResult.supplement,
      llmSupplementAreas: fusionResult.blindAreas,
    };
  }

  async classifyKnowledge(topic: string): Promise<KnowledgeType> {
    this.progress("classifying", "分析知识点类型...", 40);
    const response = await chatCompletion(
      this.apiKey,
      prompts.knowledgeTypeClassification(topic)
    );

    const validTypes: KnowledgeType[] = [
      "mathematical",
      "physical",
      "architectural",
      "logical",
      "conceptual",
      "practical",
    ];

    const cleaned = response.content.trim().toLowerCase().replace(/["']/g, "");
    if (validTypes.includes(cleaned as KnowledgeType)) {
      return cleaned as KnowledgeType;
    }

    return "conceptual"; // default fallback
  }

  async generateOutline(
    topic: string,
    knowledgeType: KnowledgeType,
    materials: string
  ): Promise<{ layer: number; title: string; keyPoints: string[] }[]> {
    this.progress("generating", "生成大纲...", 50);
    const response = await chatCompletion(
      this.apiKey,
      prompts.outlineGeneration(topic, knowledgeType, materials),
      { maxTokens: 2048 }
    );

    const outline = parseJsonResponse<{
      sections: { layer: number; title: string; keyPoints: string[] }[];
    }>(response.content, {
      sections: [
        { layer: 1, title: "直觉层", keyPoints: ["一句话定义", "生活类比"] },
        { layer: 2, title: "原理层", keyPoints: ["核心原理", "关键推导"] },
        { layer: 3, title: "深入层", keyPoints: ["完整证明", "边界情况"] },
        { layer: 4, title: "应用层", keyPoints: ["实际应用", "常见误区"] },
      ],
    });

    return outline.sections;
  }

  async generateSection(
    topic: string,
    knowledgeType: KnowledgeType,
    section: { layer: number; title: string; keyPoints: string[] },
    materials: string
  ): Promise<WikiSection> {
    const layer = section.layer as 1 | 2 | 3 | 4;
    this.progress(
      "generating",
      `生成: ${section.title}...`,
      50 + section.layer * 10
    );

    const response = await chatCompletion(
      this.apiKey,
      prompts.sectionGeneration(
        topic,
        knowledgeType,
        layer,
        section.title,
        section.keyPoints,
        materials
      ),
      { maxTokens: 4096, timeout: 120_000 } // 2 minutes for detailed section generation
    );

    const { markdown, charts } = parseSectionResponse(response.content);

    return {
      layer,
      title: section.title,
      markdown,
      imageInstructions: charts,
    };
  }

  async generateWikiHeader(topic: string): Promise<string> {
    this.progress("generating", "生成文档头部...", 45);
    const response = await chatCompletion(
      this.apiKey,
      prompts.wikiHeaderGeneration(topic),
      { maxTokens: 1024 }
    );
    return response.content;
  }

  async generateWikiFooter(
    topic: string,
    sections: WikiSection[]
  ): Promise<string> {
    this.progress("generating", "生成总结和参考资料...", 95);
    const response = await chatCompletion(
      this.apiKey,
      prompts.wikiFooterGeneration(
        topic,
        sections.map((s) => ({
          layer: s.layer,
          title: s.title,
          content: s.markdown || "",
        }))
      ),
      { maxTokens: 2048 }
    );
    return response.content;
  }

  async orchestrate(
    topic: string,
    searchResults: SearchResult[],
    sourceCounts?: Record<string, number>
  ): Promise<{
    materialPackage: MaterialPackage;
    sections: WikiSection[];
    knowledgeType: KnowledgeType;
    header?: string;
    footer?: string;
  }> {
    // 1. Filter results
    const filtered = await this.filterResults(topic, searchResults);

    // 2. Fuse knowledge (pass source counts for diversity check)
    const materialPackage = await this.fuseKnowledge(topic, filtered, sourceCounts);

    // 3. Classify
    const knowledgeType = await this.classifyKnowledge(topic);

    // 4. Generate outline
    const materialsStr = JSON.stringify({
      searchResults: filtered.slice(0, 10),
      llmSupplement: materialPackage.llmSupplement,
    });
    const outline = await this.generateOutline(
      topic,
      knowledgeType,
      materialsStr
    );

    // 5. Generate header with TOC
    const header = await this.generateWikiHeader(topic);

    // 6. Generate each section
    const sections: WikiSection[] = [];
    for (const section of outline) {
      const wikiSection = await this.generateSection(
        topic,
        knowledgeType,
        section,
        materialsStr
      );
      sections.push(wikiSection);
    }

    // 7. Generate footer with summary and references
    const footer = await this.generateWikiFooter(topic, sections);

    this.progress("done", "生成完成！", 100);
    return { materialPackage, sections, knowledgeType, header, footer };
  }
}
