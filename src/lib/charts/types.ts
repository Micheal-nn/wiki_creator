import type { ChartType } from "@/types";

export interface RenderedChart {
  id: string;
  type: ChartType;
  dataUrl: string;
  altText: string;
}

export interface ChartRenderRequest {
  type: ChartType;
  description: string;
  mermaidCode?: string;
  templateData?: Record<string, string>;
}
