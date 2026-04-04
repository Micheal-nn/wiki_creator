import type { RenderedChart, ChartRenderRequest } from "./types";

let mermaidInitialized = false;

async function initMermaid() {
  if (mermaidInitialized) return;
  const mermaid = (await import("mermaid")).default;
  mermaid.initialize({
    startOnLoad: false,
    theme: "default",
    securityLevel: "loose",
    fontFamily: "inherit",
  });
  mermaidInitialized = true;
}

function generateFallbackCode(request: ChartRenderRequest): string {
  return `graph TD
    A["${request.description}"] --> B["要点 1"]
    A --> C["要点 2"]
    A --> D["要点 3"]`;
}

export async function renderMermaidDiagram(
  request: ChartRenderRequest,
  id: string
): Promise<RenderedChart> {
  await initMermaid();
  const mermaid = (await import("mermaid")).default;

  const code = request.mermaidCode || generateFallbackCode(request);

  try {
    const { svg } = await mermaid.render(`chart-${id}`, code);
    const svgDataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;

    return {
      id,
      type: "mermaid",
      dataUrl: svgDataUrl,
      altText: request.description,
    };
  } catch (error) {
    console.error("Mermaid render failed:", error);
    return {
      id,
      type: "mermaid",
      dataUrl: "",
      altText: request.description,
    };
  }
}
