# Loading Animation Design

## Overview

为 Wiki Creator 首页添加现代简约的加载动画，在用户点击"生成 Wiki"后显示，转移等待注意力。

## Design Principles

- **Minimal**: 极简设计，无冗余元素
- **Modern**: 现代 UI 风格，参考 ChatGPT/Claude
- **Smooth**: 平滑过渡，ease-out curves
- **Subtle**: 微妙的动画，不过度吸引

## Component Structure

### New Component: `LoadingAnimation`

**Location**: `src/components/loading-animation.tsx`

**Props**:
```typescript
interface LoadingAnimationProps {
  steps?: string[];      // Progress steps to cycle through
  interval?: number;     // Time per step in ms (default: 4000)
  className?: string;    // Optional styling
}
```

### Visual Layout

```
┌─────────────────────────────────────────┐
│                                         │
│        ╭─────────────────────╮          │
│        │   🌐 搜索学术资料    │          │
│        │                     │          │
│        │ ━━━━━━━━━━━░░░░░░  │          │
│        │                     │          │
│        │     ●  ·  ·        │          │
│        ╰─────────────────────╯          │
│                                         │
└─────────────────────────────────────────┘
```

## Animation Details

### Elements

| Element | Effect | Timing |
|---------|--------|--------|
| 图标 | 轻微呼吸 pulse | 2s loop |
| 步骤文字 | 淡入淡出切换 | 300ms transition |
| 进度条 | 渐变流动 | 2s linear infinite |
| 底部圆点 | 波浪式呼吸 | stagger delays |

### Progress Steps

精简到 5 个步骤，每个约 4 秒，总共约 20 秒：

1. `搜索学术资料` - Searching academic sources
2. `聚合多源信息` - Aggregating sources
3. `分析知识结构` - Analyzing structure
4. `生成四层内容` - Generating 4-layer content
5. `润色排版` - Polishing

## Styling

### Color Palette

```css
/* Background */
background: rgba(255, 255, 255, 0.8);
backdrop-filter: blur(8px);

/* Text */
color: #4B5563; /* gray-600 */

/* Accent */
color: #3B82F6; /* blue-500 */

/* Progress Bar */
background: linear-gradient(90deg, #3B82F6, #6366F1);
```

### Motion

- **Easing**: `ease-out` for all transitions
- **Duration**: 300ms for text changes, 2s for loops
- **Stagger**: 150ms delay between dot animations

## Integration

### Page Changes

**File**: `src/app/page.tsx`

**Current State**:
```tsx
{loading && (
  <Button disabled>{loading ? "生成中..." : "生成 Wiki"}</Button>
)}
```

**New State**:
```tsx
{loading ? (
  <LoadingAnimation steps={DEFAULT_STEPS} />
) : (
  // Original input card
)}
```

### Import

```tsx
import { LoadingAnimation, DEFAULT_LOADING_STEPS } from "@/components/loading-animation";
```

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/loading-animation.tsx` | Create |
| `src/app/page.tsx` | Modify - integrate component |

## Success Criteria

1. ✅ 动画在点击生成后立即显示
2. ✅ 步骤文字平滑切换，无闪烁
3. ✅ 进度条有流动动画效果
4. ✅ 圆点有波浪式呼吸动画
5. ✅ 整体风格现代简约，与现有 UI 一致
6. ✅ 构建通过，无 TypeScript 错误
