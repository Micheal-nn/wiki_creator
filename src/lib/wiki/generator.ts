import { getDb } from "@/lib/db";
import { wikis, wikiSections, searchResults } from "@/lib/db/schema";
import { aggregatedSearch } from "@/lib/search/aggregator";
import { Orchestrator } from "@/lib/llm/orchestrator";
import { v4 as uuid } from "uuid";
import { eq } from "drizzle-orm";
import type { GenerationProgress, WikiSection as WikiSectionData } from "@/types";

/**
 * Generate a complete wiki for a given topic.
 */
export async function generateWiki(
  topic: string,
  userId: string,
  apiKey: string,
  tavilyApiKey?: string,
  onProgress?: (progress: GenerationProgress) => void
): Promise<{
  id: string;
  topic: string;
  knowledgeType: string | null;
  status: string;
  markdown: string | null;
  sections: {
    id: string;
    layer: number;
    title: string;
    markdown: string | null;
    order: number;
  }[];
}> {
  const db = getDb();

  const wikiId = uuid();
  await db.insert(wikis).values({
    id: wikiId,
    userId,
    topic,
    status: "generating",
  });

  try {
    onProgress?.({ stage: "searching", message: "正在搜索相关信息...", progress: 5 });

    // Run aggregated search (pass both Tavily and GLM5 keys)
    const searchResult = await aggregatedSearch(topic, tavilyApiKey, apiKey);
    const searchResultList = searchResult.results;

    // Log source diversity info
    console.log("[Generator] Sources used:", searchResult.sourcesUsed);
    console.log("[Generator] Source counts:", searchResult.sourceCounts);
    
    if (searchResult.diversityWarning) {
      console.warn("[Generator]", searchResult.diversityWarning);
      onProgress?.({ 
        stage: "searching", 
        message: `搜索完成（${searchResult.sourcesUsed.length}/4 源可用）`, 
        progress: 15 
      });
    } else {
      onProgress?.({ 
        stage: "searching", 
        message: `搜索完成，从 ${searchResult.sourcesUsed.length} 个来源找到 ${searchResultList.length} 条结果`, 
        progress: 15 
      });
    }

    // Save search results to DB
    for (const result of searchResultList) {
      await db.insert(searchResults).values({
        id: uuid(),
        wikiId,
        sourceType: result.sourceType,
        sourceName: result.sourceName,
        url: result.url,
        title: result.title,
        snippet: result.snippet.slice(0, 500),
        credibility: result.credibility,
        infoType: result.infoType,
      });
    }

    // Run LLM orchestration pipeline
    const orchestrator = new Orchestrator(apiKey, onProgress);
    const { materialPackage, sections, knowledgeType, header, footer } =
      await orchestrator.orchestrate(topic, searchResultList, searchResult.sourceCounts);

    // Save sections to DB
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      await db.insert(wikiSections).values({
        id: uuid(),
        wikiId,
        layer: section.layer,
        title: section.title,
        markdown: section.markdown,
        order: i,
      });
    }

    // Combine into full markdown with header and footer
    const fullMarkdown = sectionsToMarkdown(sections, topic, header, footer);

    // Update wiki record
    await db
      .update(wikis)
      .set({
        knowledgeType,
        status: "ready",
        markdown: fullMarkdown,
        sources: materialPackage.searchResults.map((r) => ({
          sourceType: r.sourceType,
          sourceName: r.sourceName,
          url: r.url,
          title: r.title,
          credibility: r.credibility,
        })),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(wikis.id, wikiId));

    // Fetch saved sections
    const savedSections = await db
      .select({
        id: wikiSections.id,
        layer: wikiSections.layer,
        title: wikiSections.title,
        markdown: wikiSections.markdown,
        order: wikiSections.order,
      })
      .from(wikiSections)
      .where(eq(wikiSections.wikiId, wikiId));

    onProgress?.({ stage: "done", message: "Wiki 生成完成！", progress: 100 });

    return {
      id: wikiId,
      topic,
      knowledgeType,
      status: "ready",
      markdown: fullMarkdown,
      sections: savedSections,
    };
  } catch (error) {
    await db
      .update(wikis)
      .set({ status: "error" })
      .where(eq(wikis.id, wikiId));

    onProgress?.({ stage: "error", message: String(error), progress: 0 });
    throw error;
  }
}

/**
 * Regenerate a single section of a wiki.
 */
export async function regenerateSection(
  wikiId: string,
  sectionId: string,
  apiKey: string,
  onProgress?: (progress: GenerationProgress) => void
): Promise<WikiSectionData> {
  const db = getDb();

  const [wiki] = await db
    .select()
    .from(wikis)
    .where(eq(wikis.id, wikiId))
    .limit(1);

  if (!wiki) throw new Error("Wiki not found");

  const [existingSection] = await db
    .select()
    .from(wikiSections)
    .where(eq(wikiSections.id, sectionId))
    .limit(1);

  if (!existingSection) throw new Error("Section not found");

  const orchestrator = new Orchestrator(apiKey, onProgress);
  const newSection = await orchestrator.generateSection(
    wiki.topic,
    (wiki.knowledgeType || "conceptual") as
      | "mathematical"
      | "physical"
      | "architectural"
      | "logical"
      | "conceptual"
      | "practical",
    {
      layer: existingSection.layer,
      title: existingSection.title,
      keyPoints: [existingSection.markdown?.slice(0, 100) || "regenerate"],
    },
    JSON.stringify({ wikiId })
  );

  await db
    .update(wikiSections)
    .set({ markdown: newSection.markdown })
    .where(eq(wikiSections.id, sectionId));

  // Rebuild full markdown
  const updatedSections = await db
    .select()
    .from(wikiSections)
    .where(eq(wikiSections.wikiId, wikiId));

  const fullMarkdown = sectionsToMarkdown(
    updatedSections.map((s) => ({
      layer: s.layer,
      title: s.title,
      markdown: s.markdown ?? "",
    })),
    wiki.topic
  );

  await db
    .update(wikis)
    .set({ markdown: fullMarkdown, updatedAt: new Date().toISOString() })
    .where(eq(wikis.id, wikiId));

  return newSection;
}

/**
 * Combine wiki sections into a single markdown document.
 */
export function sectionsToMarkdown(
  sections: { layer: number; title: string; markdown: string }[],
  topic?: string,
  header?: string,
  footer?: string
): string {
  const layerNames: Record<number, string> = {
    1: "直觉层",
    2: "原理层",
    3: "深入层",
    4: "应用层",
  };

  const layerIcons: Record<number, string> = {
    1: "💡",
    2: "🔬",
    3: "🧠",
    4: "🚀",
  };

  const bodyContent = sections
    .sort((a, b) => a.layer - b.layer)
    .map((section) => {
      const layerName = layerNames[section.layer] || `Layer ${section.layer}`;
      const icon = layerIcons[section.layer] || "📄";
      return `---\n\n## ${icon} ${layerName}\n\n### ${section.title}\n\n${section.markdown}`;
    })
    .join("\n\n");

  // Assemble full document
  let fullDocument = "";

  // Add header if provided
  if (header) {
    fullDocument += header + "\n\n";
  } else if (topic) {
    // Fallback header
    fullDocument += `# ${topic}\n\n## 【Wiki目录导航】\n\n- [直觉层](#直觉层)\n- [原理层](#原理层)\n- [深入层](#深入层)\n- [应用层](#应用层)\n\n`;
  }

  // Add body content
  fullDocument += bodyContent;

  // Add footer if provided
  if (footer) {
    fullDocument += "\n\n---\n\n" + footer;
  } else {
    // Fallback footer
    fullDocument += `\n\n---\n\n## 【核心知识点总结】\n\n本文档基于金字塔原理、费曼学习法、第一性原理构建，帮助不同层级的读者掌握「${topic || "该知识点"}」的核心内容。`;
  }

  return fullDocument;
}

/**
 * Export wiki as a standalone markdown file.
 */
export function exportMarkdown(wiki: {
  topic: string;
  markdown: string | null;
  createdAt: string | null;
}): string {
  const header = `# ${wiki.topic}\n\n> Generated by Wiki Creator on ${wiki.createdAt || "unknown date"}\n\n---\n\n`;
  return header + (wiki.markdown || "");
}
