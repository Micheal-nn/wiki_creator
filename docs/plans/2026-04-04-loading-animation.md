# Loading Animation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a modern, minimal loading animation component to the Wiki Creator homepage that displays during wiki generation.

**Architecture:** Create a new `LoadingAnimation` component with smooth fade transitions, animated progress bar, and pulsing dots. Replace the simple button loading state with this component.

**Tech Stack:** React, TypeScript, Tailwind CSS, Framer Motion (CSS animations)

---

### Task 1: Create LoadingAnimation Component

**Files:**
- Create: `src/components/loading-animation.tsx`

**Step 1: Create the component file**

```tsx
"use client";

import { useState, useEffect } from "react";

// Default progress steps
export const DEFAULT_LOADING_STEPS = [
  "搜索学术资料",
  "聚合多源信息", 
  "分析知识结构",
  "生成四层内容",
  "润色排版",
];

interface LoadingAnimationProps {
  steps?: string[];
  interval?: number;
}

export function LoadingAnimation({
  steps = DEFAULT_LOADING_STEPS,
  interval = 4000,
}: LoadingAnimationProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const stepTimer = setInterval(() => {
      setIsVisible(false);
      
      setTimeout(() => {
        setCurrentStepIndex((prev) => (prev + 1) % steps.length);
        setIsVisible(true);
      }, 300);
    }, interval);

    return () => clearInterval(stepTimer);
  }, [steps.length, interval]);

  return (
    <div className="w-full max-w-md mx-auto text-center py-16">
      {/* Icon with pulse */}
      <div className="mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-50 to-indigo-100 animate-pulse">
          <span className="text-3xl">✨</span>
        </div>
      </div>

      {/* Step text with fade */}
      <div className="h-8 mb-8">
        <p
          className={`text-lg font-medium text-gray-600 transition-all duration-300 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}
        >
          {steps[currentStepIndex]}
        </p>
      </div>

      {/* Animated progress bar */}
      <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden mb-8">
        <div className="h-full bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 rounded-full animate-progress" />
      </div>

      {/* Pulsing dots */}
      <div className="flex justify-center gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-blue-400 animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Add the progress bar animation to globals.css**

Add to `src/app/globals.css`:

```css
@keyframes progress {
  0% {
    width: 0%;
  }
  50% {
    width: 70%;
  }
  100% {
    width: 100%;
  }
}

.animate-progress {
  animation: progress 4s ease-in-out infinite;
}
```

**Step 3: Verify component builds**

Run: `npm run build`
Expected: Build passes with no errors

---

### Task 2: Integrate LoadingAnimation into Homepage

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Import the component**

Add to imports at top of file:

```tsx
import { LoadingAnimation } from "@/components/loading-animation";
```

**Step 2: Replace the loading state UI**

Replace the entire return statement's content (lines 46-124) with:

```tsx
return (
  <main className="min-h-screen flex flex-col">
    {/* Header */}
    <header className="border-b px-6 py-4 flex items-center justify-between">
      <h1 className="text-xl font-bold">Wiki Creator</h1>
      <Button variant="ghost" onClick={() => router.push("/settings")}>
        ⚙️ 设置
      </Button>
    </header>

    {/* Main Content */}
    <div className="flex-1 flex items-center justify-center px-6">
      {loading ? (
        <LoadingAnimation />
      ) : (
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">输入知识点，生成深入浅出的 Wiki</CardTitle>
            <CardDescription>
              自动搜索学术、技术、通用多源信息，结合大模型生成 4 层金字塔结构讲解
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={topic}
                onChange={(e) => {
                  setTopic(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !loading) {
                    handleGenerate();
                  }
                }}
                placeholder="例如：量子计算、机器学习、区块链..."
                disabled={loading}
                className="text-lg py-6"
                autoFocus
              />
              <Button
                onClick={handleGenerate}
                disabled={loading || !topic.trim()}
                className="px-8"
              >
                生成 Wiki
              </Button>
            </div>

            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}

            {/* Feature hints */}
            <div className="grid grid-cols-2 gap-3 mt-6 pt-6 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>🔍</span>
                <span>多源搜索聚合</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>🧠</span>
                <span>智能 LLM 编排</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>📊</span>
                <span>图表可视化</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>📝</span>
                <span>4 层金字塔结构</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>

    {/* Footer */}
    <footer className="border-t px-6 py-4 text-center text-sm text-muted-foreground">
      <Button variant="link" onClick={() => router.push("/history")}>
        查看历史记录
      </Button>
    </footer>
  </main>
);
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Build passes

---

### Task 3: Final Verification

**Step 1: Run development server**

Run: `npm run dev`

**Step 2: Manual test**

1. Open http://localhost:3000
2. Enter a topic
3. Click "生成 Wiki"
4. Verify:
   - Card is replaced with loading animation
   - Sparkle icon pulses
   - Step text fades and changes every ~4 seconds
   - Progress bar animates
   - Dots bounce with stagger

**Step 3: Commit**

```bash
git add src/components/loading-animation.tsx src/app/page.tsx src/app/globals.css
git commit -m "feat: add modern loading animation for wiki generation"
```

---

## Files Summary

| File | Action |
|------|--------|
| `src/components/loading-animation.tsx` | Create |
| `src/app/globals.css` | Modify - add progress animation |
| `src/app/page.tsx` | Modify - integrate component |

## Success Criteria

1. ✅ Component renders correctly
2. ✅ Step text transitions smoothly (fade in/out)
3. ✅ Progress bar animates continuously
4. ✅ Dots bounce with staggered delays
5. ✅ Build passes with no TypeScript errors
6. ✅ Animation displays when loading=true
7. ✅ Original form displays when loading=false
