# Wiki Visualization Enhancement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Mermaid chart rendering and CogView AI image generation to Wiki Creator for visual wiki pages.

**Architecture:** Client-side Mermaid rendering via markdown code blocks + server-side CogView API for AI images. LLM generates chart instructions, MarkdownRenderer handles Mermaid, new API route handles CogView.

**Tech Stack:** React, TypeScript, Mermaid.js, 智谱 AI CogView API, Next.js API Routes

---

### Task 1: Update Types for Mindmap

**Files:**
- Modify: `src/types/index.ts:28-33`

**Step 1: Add mindmap to ChartType**

```typescript
// Chart types
export type ChartType =
  | "mermaid"
  | "mindmap"
  | "ai-image"
  | "infographic"
  | "table";
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build passes

---

### Task 2: Add Mermaid Rendering to MarkdownRenderer

**Files:**
- Modify: `src/components/markdown-renderer.tsx`

**Step 1: Add mermaid import and initialization**

Add after the existing imports:

```typescript
import { useEffect, useRef } from "react";

// Mermaid initialization (client-side only)
let mermaidInitialized = false;

async function initMermaid() {
  if (mermaidInitialized || typeof window === "undefined") return;
  const mermaid = (await import("mermaid")).default;
  mermaid.initialize({
    startOnLoad: false,
    theme: "default",
    securityLevel: "loose",
    fontFamily: "inherit",
  });
  mermaidInitialized = true;
}
```

**Step 2: Create MermaidBlock component**

Add before `MarkdownRenderer` function:

```typescript
function MermaidBlock({ code }: { code: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState(false);

  useEffect(() => {
    async function renderMermaid() {
      try {
        await initMermaid();
        const mermaid = (await import("mermaid")).default;
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const { svg } = await mermaid.render(id, code);
        setSvg(svg);
        setError(false);
      } catch (err) {
        console.error("Mermaid render error:", err);
        setError(true);
      }
    }
    renderMermaid();
  }, [code]);

  if (error) {
    return (
      <pre className="bg-gray-100 p-4 rounded-lg text-sm text-red-600">
        Mermaid syntax error
      </pre>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-4 flex justify-center overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
```

**Step 3: Add mermaid code block handling**

In the `components` object of `ReactMarkdown`, add the `code` component modification:

```typescript
code: ({ className, children, ...props }) => {
  const isInline = !className;
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "";
  
  // Handle mermaid code blocks
  if (language === "mermaid") {
    const code = String(children).replace(/\n$/, "");
    return <MermaidBlock code={code} />;
  }
  
  if (isInline) {
    return (
      <code
        className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono"
        {...props}
      >
        {children}
      </code>
    );
  }
  
  // Block code - just render the code content
  return (
    <code className={className} {...props}>
      {children}
    </code>
  );
},
```

**Step 4: Add useState import**

Update the imports at the top:

```typescript
import React, { useMemo, useState, useEffect, useRef } from "react";
```

**Step 5: Verify build**

Run: `npm run build`
Expected: Build passes

---

### Task 3: Create CogView Renderer

**Files:**
- Create: `src/lib/charts/cogview-renderer.ts`

**Step 1: Create the file**

```typescript
interface CogViewRequest {
  model: "cogview-3";
  prompt: string;
  size?: "1024x1024" | "768x768" | "512x512";
}

interface CogViewResponse {
  created: number;
  data: Array<{
    url?: string;
    b64_json?: string;
  }>;
}

/**
 * Generate an image using CogView API (智谱 AI)
 */
export async function generateImage(
  prompt: string,
  apiKey: string,
  size: "1024x1024" | "768x768" | "512x512" = "1024x1024"
): Promise<{ success: boolean; dataUrl?: string; error?: string }> {
  const apiUrl = "https://open.bigmodel.cn/api/paas/v4/images/generations";

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "cogview-3",
        prompt: `为维基百科文章生成配图：${prompt}`,
        size,
      } as CogViewRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[CogView] API error:", errorText);
      return {
        success: false,
        error: `CogView API error: ${response.status}`,
      };
    }

    const result: CogViewResponse = await response.json();

    if (result.data && result.data.length > 0) {
      const imageData = result.data[0];
      
      // Prefer base64 data URL
      if (imageData.b64_json) {
        return {
          success: true,
          dataUrl: `data:image/png;base64,${imageData.b64_json}`,
        };
      }
      
      // Fallback to URL
      if (imageData.url) {
        return {
          success: true,
          dataUrl: imageData.url,
        };
      }
    }

    return {
      success: false,
      error: "No image data returned",
    };
  } catch (error) {
    console.error("[CogView] Error:", error);
    return {
      success: false,
      error: String(error),
    };
  }
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build passes

---

### Task 4: Create AI Image API Route

**Files:**
- Create: `src/app/api/charts/ai-image/route.ts`

**Step 1: Create the API route**

```typescript
import { NextResponse } from "next/server";
import { generateImage } from "@/lib/charts/cogview-renderer";
import { getInitializedDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { ApiResponse } from "@/types";

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      prompt: string;
      size?: "1024x1024" | "768x768" | "512x512";
    };

    const { prompt, size = "1024x1024" } = body;

    if (!prompt) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Get API key from database or environment
    const db = await getInitializedDb();
    const [dbUser] = await db.select().from(users).limit(1);
    
    let apiKey = dbUser?.apiKey || process.env.GLM5_API_KEY;

    if (!apiKey) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "GLM5 API Key 未配置" },
        { status: 400 }
      );
    }

    const result = await generateImage(prompt, apiKey, size);

    if (!result.success) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: result.error || "Image generation failed" },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<{ dataUrl: string }>>({
      success: true,
      data: { dataUrl: result.dataUrl! },
    });
  } catch (error) {
    console.error("[AI Image API] Error:", error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build passes

---

### Task 5: Update Prompts for Chart Generation

**Files:**
- Modify: `src/lib/llm/prompts.ts`

**Step 1: Add chart generation guidelines constant**

Add after `MARKDOWN_FORMATTING_RULES`:

```typescript
/**
 * Chart generation guidelines
 */
const CHART_GENERATION_GUIDELINES = `
# 图表生成规则

## 何时生成图表
仅在以下情况生成图表，避免过度可视化：
1. **流程/步骤** → 使用 Mermaid 流程图
2. **概念层级/知识结构** → 使用 Mermaid 思维导图
3. **抽象概念的可视化** → 使用 AI 配图（谨慎使用）

## 图表类型选择

### Mermaid 流程图 (mermaid)
用于展示：
- 执行步骤、工作流程
- 系统架构、组件关系
- 决策分支、条件判断

示例：
\`\`\`mermaid
graph TD
  A[输入] --> B[处理]
  B --> C{判断}
  C -->|是| D[输出1]
  C -->|否| E[输出2]
\`\`\`

### Mermaid 思维导图 (mindmap)
用于展示：
- 概念层级
- 知识结构
- 多维度分类

示例：
\`\`\`mermaid
mindmap
  root((核心概念))
    子概念1
      细节A
      细节B
    子概念2
      细节C
\`\`\`

### AI 配图 (ai-image)
用于展示：
- 抽象概念的可视化
- 物理现象、实验装置
- 历史场景

仅在内容确实需要视觉辅助时使用。

## 输出格式
在内容末尾输出：
CHART_JSON: {"charts":[{"type":"mermaid|mindmap|ai-image","description":"...","mermaidCode":"..."}]}

每个章节最多 1-2 个图表。`;
```

**Step 2: Add guidelines to sectionGeneration prompt**

In the `sectionGeneration` function, add after `MARKDOWN_FORMATTING_RULES`:

```typescript
${CHART_GENERATION_GUIDELINES}
```

**Step 3: Update CHART_JSON format in prompt**

Update the CHART_JSON example at the end:

```typescript
在内容末尾，建议0-2个图表（可选）：
CHART_JSON: {"charts":[{"type":"mermaid|mindmap|ai-image","description":"图表描述","mermaidCode":"mermaid代码(仅type为mermaid/mindmap时)"}]}`,
```

**Step 4: Verify build**

Run: `npm run build`
Expected: Build passes

---

### Task 6: Add AI Image Placeholder Handling

**Files:**
- Modify: `src/components/markdown-renderer.tsx`

**Step 1: Add AIImagePlaceholder component**

Add before `MarkdownRenderer`:

```typescript
function AIImagePlaceholder({ 
  description, 
  index 
}: { 
  description: string; 
  index: number;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const loadImage = useCallback(async () => {
    if (loading || imageUrl) return;
    setLoading(true);
    try {
      const res = await fetch("/api/charts/ai-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: description }),
      });
      const data = await res.json();
      if (data.success && data.data?.dataUrl) {
        setImageUrl(data.data.dataUrl);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [description, loading, imageUrl]);

  // Lazy load on mount
  useEffect(() => {
    const timer = setTimeout(loadImage, index * 1000); // Stagger loading
    return () => clearTimeout(timer);
  }, [loadImage, index]);

  if (error) {
    return (
      <div className="my-4 p-4 bg-gray-100 rounded-lg text-center text-gray-500">
        [图片加载失败: {description}]
      </div>
    );
  }

  if (loading) {
    return (
      <div className="my-4 p-8 bg-gray-50 rounded-lg text-center animate-pulse">
        <span className="text-gray-400">🎨 正在生成配图...</span>
      </div>
    );
  }

  if (imageUrl) {
    return (
      <div className="my-4 flex justify-center">
        <img 
          src={imageUrl} 
          alt={description} 
          className="max-w-full h-auto rounded-lg shadow-md"
        />
      </div>
    );
  }

  return null;
}
```

**Step 2: Handle ai-image placeholders in pre component**

Add to the `pre` component in MarkdownRenderer:

```typescript
// Handle AI image placeholders
if (children && typeof children === "string" && children.startsWith("AI_IMAGE:")) {
  const description = children.replace("AI_IMAGE:", "").trim();
  return <AIImagePlaceholder description={description} index={0} />;
}
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Build passes

---

### Task 7: Final Integration and Testing

**Step 1: Create test wiki with charts**

1. Start dev server: `npm run dev`
2. Open http://localhost:3000
3. Generate a wiki for a topic like "机器学习" or "HTTP协议"
4. Verify:
   - Mermaid code blocks render as SVG diagrams
   - Flowcharts display correctly
   - Mindmaps display correctly (if used)

**Step 2: Verify CogView API (optional)**

1. Ensure GLM5_API_KEY is configured
2. Generate a wiki that includes AI image instructions
3. Check terminal logs for CogView API calls
4. Verify images appear in the wiki

**Step 3: Final build check**

Run: `npm run build`
Expected: Build passes with no errors

**Step 4: Commit**

```bash
git add src/types/index.ts src/components/markdown-renderer.tsx src/lib/charts/cogview-renderer.ts src/app/api/charts/ai-image/route.ts src/lib/llm/prompts.ts
git commit -m "feat: add Mermaid charts and CogView AI image generation"
```

---

## Files Summary

| File | Action | Description |
|------|--------|-------------|
| `src/types/index.ts` | Modify | Add mindmap to ChartType |
| `src/components/markdown-renderer.tsx` | Modify | Add Mermaid + AI image rendering |
| `src/lib/charts/cogview-renderer.ts` | Create | CogView API integration |
| `src/app/api/charts/ai-image/route.ts` | Create | AI image API endpoint |
| `src/lib/llm/prompts.ts` | Modify | Add chart generation guidelines |

## Success Criteria

1. ✅ Mermaid flowcharts render correctly
2. ✅ Mermaid mindmaps render correctly
3. ✅ AI images can be generated via CogView
4. ✅ Charts enhance wiki readability
5. ✅ No build errors
6. ✅ Performance remains acceptable
