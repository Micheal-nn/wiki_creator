import type { ChartInstruction } from "@/types";
import type { RenderedChart, ChartRenderRequest } from "./types";
import { renderMermaidDiagram } from "./mermaid-renderer";
import { renderInfographic } from "./infographic-renderer";

export async function renderChart(
  instruction: ChartInstruction,
  index: number
): Promise<RenderedChart> {
  const id = `chart-${Date.now()}-${index}`;
  const request: ChartRenderRequest = {
    type: instruction.type,
    description: instruction.description,
    mermaidCode: instruction.mermaidCode,
    templateData: instruction.templateData,
  };

  switch (instruction.type) {
    case "mermaid":
    case "mindmap":
      return renderMermaidDiagram(request, id);
    case "infographic":
    case "table":
      return renderInfographic(request, id);
    case "ai-image":
      // Phase 2: AI image generation
      return {
        id,
        type: "ai-image",
        dataUrl: "",
        altText: instruction.description,
      };
    default:
      return renderInfographic(request, id);
  }
}

export async function renderAllCharts(
  instructions: ChartInstruction[]
): Promise<RenderedChart[]> {
  const results = await Promise.allSettled(
    instructions.map((instruction, index) => renderChart(instruction, index))
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<RenderedChart> =>
        r.status === "fulfilled"
    )
    .map((r) => r.value);
}
