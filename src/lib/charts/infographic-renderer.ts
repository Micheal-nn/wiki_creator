import type { RenderedChart, ChartRenderRequest } from "./types";

const TEMPLATES: Record<string, (data: Record<string, string>) => string> = {
  comparison: (data) => `
    <div style="display:flex;gap:16px;padding:24px;background:#fff;font-family:system-ui,sans-serif;">
      ${Object.entries(data)
        .map(
          ([key, val]) => `
        <div style="flex:1;padding:16px;border:2px solid #e5e7eb;border-radius:8px;">
          <h3 style="margin:0 0 8px;font-size:14px;color:#6b7280;">${key}</h3>
          <p style="margin:0;font-size:16px;font-weight:600;">${val}</p>
        </div>`
        )
        .join("")}
    </div>`,

  flow: (data) => `
    <div style="display:flex;align-items:center;gap:8px;padding:24px;background:#fff;font-family:system-ui,sans-serif;">
      ${Object.entries(data)
        .map(
          ([key, val], i, arr) => `
        <div style="padding:12px 16px;background:#f3f4f6;border-radius:8px;text-align:center;">
          <div style="font-size:12px;color:#6b7280;">${key}</div>
          <div style="font-weight:600;">${val}</div>
        </div>
        ${i < arr.length - 1 ? '<div style="color:#9ca3af;font-size:20px;">→</div>' : ""}`
        )
        .join("")}
    </div>`,

  card: (data) => `
    <div style="padding:24px;background:#fff;font-family:system-ui,sans-serif;max-width:400px;">
      ${Object.entries(data)
        .map(
          ([key, val]) => `
        <div style="margin-bottom:12px;">
          <div style="font-size:12px;color:#6b7280;margin-bottom:4px;">${key}</div>
          <div style="font-size:15px;line-height:1.5;">${val}</div>
        </div>`
        )
        .join("")}
    </div>`,
};

export async function renderInfographic(
  request: ChartRenderRequest,
  id: string
): Promise<RenderedChart> {
  const templateName = request.templateData?.template || "card";
  const templateFn = TEMPLATES[templateName] || TEMPLATES.card;
  const templateData = { ...(request.templateData || {}) };
  delete templateData.template;

  // Only runs in browser
  if (typeof document === "undefined") {
    return {
      id,
      type: "infographic",
      dataUrl: "",
      altText: request.description,
    };
  }

  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.innerHTML = templateFn(templateData);
  document.body.appendChild(container);

  try {
    const { toPng } = await import("html-to-image");
    const dataUrl = await toPng(container, {
      quality: 0.9,
      pixelRatio: 2,
    });

    return {
      id,
      type: "infographic",
      dataUrl,
      altText: request.description,
    };
  } catch (error) {
    console.error("Infographic render failed:", error);
    return {
      id,
      type: "infographic",
      dataUrl: "",
      altText: request.description,
    };
  } finally {
    document.body.removeChild(container);
  }
}
