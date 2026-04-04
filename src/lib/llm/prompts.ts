import type { KnowledgeType, SearchResult } from "@/types";
import type { ChatMessage } from "./client";

/**
 * Classifies a topic into a knowledge type category.
 */
export function knowledgeTypeClassification(topic: string): ChatMessage[] {
  return [
    {
      role: "system",
      content: `You are a knowledge classifier. Given a topic, classify it into exactly ONE of these categories:
- "mathematical": Math principles, formulas, theorems, proofs
- "physical": Physics, chemistry, biology principles and laws
- "architectural": System design, software architecture, infrastructure
- "logical": Algorithms, data structures, logical reasoning
- "conceptual": Abstract concepts, theories, frameworks, ideas
- "practical": Tools, libraries, frameworks, how-to guides

Respond with ONLY the category name in lowercase, nothing else.`,
    },
    {
      role: "user",
      content: `Classify this topic: "${topic}"`,
    },
  ];
}

/**
 * Filters and scores search results for quality and relevance.
 */
export function searchResultFilter(
  topic: string,
  results: SearchResult[]
): ChatMessage[] {
  const resultSummaries = results
    .map(
    (r, i) =>
        `[${i}] [${r.sourceType}] "${r.title}" (from ${r.sourceName})\n   ${r.snippet.slice(0, 200)}`
    )
    .join("\n\n");

  return [
    {
      role: "system",
      content: `You are an information quality analyst. Given a topic and a list of search results, evaluate each result.

For each result, respond with a JSON array where each element has:
- "index": the result index number
- "keep": true/false (whether to keep this result)
- "credibility": 1-5 score (5=most credible)
- "infoType": one of "definition", "principle", "analogy", "application", "misconception"
- "reason": brief reason for your decision

Scoring guide:
- 5: Academic paper, official spec, authoritative textbook
- 4: Well-known author blog, preprint, official docs
- 3: High-voted community answer, quality tutorial
- 2: Random blog, unverified information
- 1: Contradictory, outdated, or no source

Remove duplicates and low-quality results. Keep results with score >= 3.

Respond with ONLY the JSON array, no other text.`,
    },
    {
      role: "user",
      content: `Topic: "${topic}"\n\nSearch results:\n${resultSummaries}`,
    },
  ];
}

/**
 * Identifies blind spots in search results and supplements with LLM knowledge.
 */
export function knowledgeFusion(
  topic: string,
  filteredResults: SearchResult[]
): ChatMessage[] {
  const resultSummary = filteredResults
    .map(
    (r) =>
        `[${r.infoType}] "${r.title}" (${r.sourceName}, credibility: ${r.credibility})\n   ${r.snippet.slice(0, 150)}`
    )
    .join("\n\n");

  return [
    {
      role: "system",
      content: `You are a knowledge synthesis expert. Given a topic and filtered search results, identify what information is MISSING and supplement it with your own knowledge.

Focus especially on identifying gaps in:
1. Mathematical derivations or proofs
2. Physical intuition or experimental context
3. Historical background and motivation
4. Precise definitions and formal statements
5. Common misconceptions

Respond with a JSON object:
{
  "supplement": "Your supplementary knowledge in markdown format. Mark search-sourced info as [SEARCH] and your own knowledge as [LLM].",
  "blindAreas": ["area1 that was missing", "area2 that was missing"]
}

Provide substantive, accurate content — not just descriptions of what's missing.`,
    },
    {
      role: "user",
      content: `Topic: "${topic}"\n\nCurrent search results:\n${resultSummary}\n\nWhat information is missing? Supplement with your knowledge.`,
    },
  ];
}

/**
 * Generates a 4-layer pyramid outline for the topic.
 */
export function outlineGeneration(
  topic: string,
  knowledgeType: KnowledgeType,
  materials: string
): ChatMessage[] {
  const typeInstructions: Record<KnowledgeType, string> = {
    mathematical: "Focus on formula derivation steps, mathematical intuition, and proof structure.",
    physical: "Focus on physical intuition, experimental analogies, and why formulas take their form.",
    architectural: "Focus on component diagrams, data flow, design decisions and trade-offs.",
    logical: "Focus on step-by-step decomposition, complexity analysis, and reasoning chains.",
    conceptual: "Focus on clear definitions, historical development, and multi-angle comparisons.",
    practical: "Focus on use cases, operation steps, best practices, and common pitfalls.",
  };

  return [
    {
      role: "system",
      content: `You are a knowledge structuring expert. Create a 4-layer "pyramid" outline for explaining a topic.

Knowledge type: ${knowledgeType}
${typeInstructions[knowledgeType]}

Generate exactly 4 layers:
Layer 1 - 直觉层 (10-second intuition):
- One-sentence definition + daily life analogy
- NO formulas, NO jargon

Layer 2 - 原理层 (Why it works):
- Core logic + key derivation + formulas with annotations
${knowledgeType === "mathematical" ? "- Include step-by-step formula derivation" : ""}
${knowledgeType === "physical" ? "- Include physical intuition behind equations" : ""}
${knowledgeType === "architectural" ? "- Include component relationships and data flow" : ""}
${knowledgeType === "logical" ? "- Include reasoning chain and complexity" : ""}

Layer 3 - 深入层 (Complete understanding):
- Full proofs, edge cases, relationship to related concepts
- Historical background: WHY was this invented/discovered
Layer 4 - 应用层 (How to use):
- Real-world applications, code examples, common mistakes, further reading

Respond with JSON:
{
  "sections": [
    { "layer": 1, "title": "...", "keyPoints": ["point1", "point2"] },
    { "layer": 2, "title": "...", "keyPoints": ["point1"] },
    { "layer": 3, "title": "...", "keyPoints": ["point1"] },
    { "layer": 4, "title": "...", "keyPoints": ["point1"] }
  ]
}

Reply with ONLY the JSON, no other text.`,
    },
    {
      role: "user",
      content: `Create a 4-layer outline for: "${topic}"\n\nReference materials:\n${materials.slice(0, 3000)}`,
    },
  ];
}

/**
 * Generates content for one section of the wiki.
 */
export function sectionGeneration(
  topic: string,
  knowledgeType: KnowledgeType,
  layer: 1 | 2 | 3 | 4,
  sectionTitle: string,
  keyPoints: string[],
  materials: string
): ChatMessage[] {
  const typeExtras: Record<number, string> = {
    1: "",
    2: knowledgeType === "mathematical"
      ? "- Include key formulas with derivation steps annotated"
 
      : knowledgeType === "physical"
      ? "- Include physical intuition behind equations"
 
      : knowledgeType === "architectural"
      ? "- Include component relationships and data flow"
 
      : knowledgeType === "logical"
      ? "- Include reasoning chain and complexity"
 
      : "",
  };

  const layerInstructions: Record<number, string> = {
    1: `LAYER 1 - 直觉层 (Intuition):\n- Use the SIMPLEST possible language\n- Provide ONE vivid analogy from daily life\n- NO technical jargon (or explain it immediately if unavoidable)\n- Goal: anyone understands the 10 seconds`,
    2: `LAYER 2 - 原理层 (Principle):\n- Explain WHY it works, not just WHAT it is\n- Show derivations with step-by-step annotations\n${typeExtras[layer]}\n- Use questions as section headers (e.g., "为什么需要X？")`,
    3: `LAYER 3 - 深入层 (Deep):\n- Provide RIGOROUS treatment: full proofs, edge cases, limitations\n- Compare with related concepts\n- Include historical background\n- Mark collapsible sections`,
    4: `LAYER 4 - 应用层 (Application):\n- Real-world application cases\n- Code examples if applicable\n- Common misconceptions and how to avoid them\n- Recommended further reading`,
  };

  return [
    {
      role: "system",
      content: `You are a knowledge explainer following the Feynman learning technique.

Topic: "${topic}"
Knowledge type: ${knowledgeType}

${layerInstructions[layer]}

Write in Markdown format. Use Chinese.

Structure your response as:
1. The markdown content for this section
2. At the very end, suggest 1-2 charts that would help explain this section, in this format:
CHART_JSON: {"charts":[{"type":"mermaid|infographic|table","description":"what the chart shows"}]}`,
    },
    {
      role: "user",
      content: `Generate Layer ${layer} content for: "${sectionTitle}"

Key points to cover:
${keyPoints.map((p) => `- ${p}`).join("\n")}

Reference materials:
${materials.slice(0, 4000)}`,
    },
  ];
}

/**
 * Decides chart types for wiki sections.
 */
export function chartDecision(
  sections: { layer: number; title: string; content: string }[]
): ChatMessage[] {
  const sectionSummaries = sections
    .map(
      (s, i) =>
        `Section ${i + 1} (Layer ${s.layer}): "${s.title}"\n${s.content.slice(0, 300)}`
    )
    .join("\n\n");

  return [
    {
      role: "system",
      content: `You are a data visualization expert. For each wiki section, decide what charts would best illustrate the content.

Available chart types:
- "mermaid": Flowcharts, sequence diagrams, architecture diagrams (provide mermaid code)
- "infographic": Comparison cards, key statistics, highlights
- "table": Structured data comparisons

For each section, suggest 0-2 charts. Respond with JSON:
{
  "charts": [
    {
      "sectionIndex": 0,
      "type": "mermaid",
      "description": "Flowchart showing the main process",
      "mermaidCode": "graph TD\\n    A[Start] --> B[End]"
    }
  ]
}

Reply with ONLY the JSON.`,
    },
    {
      role: "user",
      content: `Sections:\n${sectionSummaries}`,
    },
  ];
}