# Wiki Visualization Enhancement Design

## Overview

为 Wiki Creator 添加图表可视化能力，支持 Mermaid 图表和 AI 文生图，让生成的 Wiki 图文并茂。

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Wiki Generation Flow                        │
├─────────────────────────────────────────────────────────────────┤
│  1. LLM generates content + CHART_JSON instructions             │
│  2. Chart instructions embedded in Markdown                     │
│  3. MarkdownRenderer renders Mermaid blocks client-side         │
│  4. CogView API generates images on request                     │
└─────────────────────────────────────────────────────────────────┘
```

## Supported Chart Types

| Type | Use Case | Rendering |
|------|----------|-----------|
| **Mermaid Flowchart** | 流程、架构、决策树 | 客户端 mermaid.js |
| **Mermaid Mindmap** | 概念关联、知识图谱 | 客户端 mermaid.js |
| **CogView AI Image** | 概念配图、场景插图 | 服务端 API → base64 |

## Components

### 1. Mermaid Integration

**File:** `src/components/markdown-renderer.tsx` (modify)

**Flow:**
1. LLM generates Markdown with mermaid code blocks:
   ```markdown
   ```mermaid
   graph TD
     A[概念] --> B[原理]
     A --> C[应用]
   ```
   ```
2. MarkdownRenderer detects `mermaid` code blocks
3. Calls `mermaid.render()` in browser
4. Replaces code block with rendered SVG

**Supported Mermaid Types:**
- `graph TD/LR/TB/RL` - Flowcharts
- `sequenceDiagram` - Sequence diagrams
- `mindmap` - Mind maps
- `gantt` - Gantt charts

### 2. CogView AI Image Generation

**File:** `src/lib/charts/cogview-renderer.ts` (new)

**API:** 智谱 AI CogView-3 (same API key as GLM5)

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
```

**Flow:**
1. LLM generates `CHART_JSON` with `type: "ai-image"`
2. On wiki page load, lazy-load images via API route
3. Cache images in database or as base64

### 3. Enhanced Prompts

**File:** `src/lib/llm/prompts.ts` (modify)

**Chart Selection Guidelines (added to prompts):**

```markdown
# 图表生成规则

根据内容类型选择合适的图表：

1. **流程图 (mermaid graph)** - 当内容涉及：
   - 执行步骤、工作流程
   - 系统架构、组件关系
   - 决策分支、条件判断

2. **思维导图 (mermaid mindmap)** - 当内容涉及：
   - 概念层级、知识结构
   - 多维度分类
   - 关键词关联

3. **AI 配图 (ai-image)** - 当内容涉及：
   - 抽象概念的可视化
   - 物理现象、实验装置
   - 历史事件、人物

4. **Markdown 表格** - 当内容涉及：
   - 数据对比
   - 特性列表
   - 参数说明

避免为每个段落都生成图表，只在关键理解点添加。
```

### 4. Types Updates

**File:** `src/types/index.ts` (modify)

```typescript
// Add to ChartType
export type ChartType =
  | "mermaid"
  | "mindmap"
  | "ai-image"
  | "infographic"
  | "table";
```

## Implementation Tasks

### Task 1: Update MarkdownRenderer for Mermaid

- Detect `mermaid` code blocks in markdown
- Import and initialize mermaid.js
- Render to SVG and replace code block
- Handle errors gracefully

### Task 2: Create CogView Renderer

- Create `src/lib/charts/cogview-renderer.ts`
- Implement API call to CogView
- Handle rate limits and errors
- Return base64 image data

### Task 3: Create AI Image API Route

- Create `src/app/api/charts/ai-image/route.ts`
- Accept prompt and return image
- Cache results in database

### Task 4: Update Prompts

- Add chart generation guidelines to prompts
- Update CHART_JSON format
- Add mindmap examples

### Task 5: Add Image Lazy Loading

- Detect `ai-image` placeholders in markdown
- Fetch images on scroll/view
- Cache in browser

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/components/markdown-renderer.tsx` | Modify | Add Mermaid rendering |
| `src/lib/charts/cogview-renderer.ts` | Create | CogView API integration |
| `src/lib/llm/prompts.ts` | Modify | Enhanced chart prompts |
| `src/types/index.ts` | Modify | Add mindmap to ChartType |
| `src/app/api/charts/ai-image/route.ts` | Create | AI image API endpoint |

## Success Criteria

1. ✅ Mermaid code blocks render as SVG diagrams
2. ✅ Mindmaps display correctly
3. ✅ AI images can be generated via CogView
4. ✅ Charts enhance wiki readability
5. ✅ No performance degradation
6. ✅ Build passes

## Cost Considerations

- **Mermaid**: Free, client-side rendering
- **CogView**: 
  - Free tier: Limited calls per day
  - Paid: ~¥0.02 per image (1024x1024)
  - Recommendation: Generate only 1-2 images per wiki
