import type { CredibilityScore, InfoType } from "@/types";
import type { SearchAdapter, RawSearchResult } from "./types";

const GLM5_API_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
const TIMEOUT_MS = 60_000;

export class LLMAdapter implements SearchAdapter {
  name = "GLM5 知识库";
  sourceType = "llm" as const;

  private apiKey: string | null = null;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GLM5_API_KEY || null;
  }

  async search(query: string): Promise<RawSearchResult[]> {
    if (!this.apiKey) {
      console.warn("[LLM] GLM5_API_KEY not set, skipping LLM knowledge query");
      return [];
    }

    console.log("[LLM] Querying GLM5 for knowledge on:", query);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const prompt = [
      `请用简洁的语言解释"${query}"的核心概念、关键原理和实际应用。要求：`,
      "1. 给出概念定义",
      "2. 解释核心原理",
      "3. 提供1-2个实际应用场景",
      "4. 说明学习这个概念的先决条件",
      "",
      "请用中文回答，保持专业但易懂。",
    ].join("\n");

    try {
      const response = await fetch(GLM5_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: "glm-4-flash",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`GLM5 API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";

      console.log("[LLM] Received response, length:", content.length);

      return [
        {
          title: `GLM5 知识综合: ${query}`,
          url: "llm://knowledge/" + query,
          snippet: content.slice(0, 500),
          credibility: 4 as CredibilityScore,
          infoType: "principle" as InfoType,
          metadata: {
            model: "glm-4-flash",
            generated: new Date().toISOString(),
          },
        },
      ];
    } catch (error) {
      // Check if this is a timeout error
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn("[LLM] Knowledge query timeout after 30s");
      } else {
        console.error("[LLM] Knowledge query failed:", error);
      }
      return [];
    } finally {
      clearTimeout(timer);
    }
}
}
