"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LoadingAnimation } from "@/components/loading-animation";
import type { GenerationProgress } from "@/types";

export default function HomePage() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState<string | undefined>();
  const [progressPercent, setProgressPercent] = useState<number | undefined>();

  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) {
      setError("请输入知识点");
      return;
    }

    setLoading(true);
    setError(null);
    setProgressMessage(undefined);
    setProgressPercent(undefined);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim() }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("无法读取响应流");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events from buffer
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        let eventType = "";
        let eventData = "";

        for (const line of lines) {
          if (line.startsWith("event:")) {
            eventType = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            eventData = line.slice(5).trim();
          } else if (line === "" && eventType && eventData) {
            // Empty line marks end of event
            try {
              const data = JSON.parse(eventData);

              switch (eventType) {
                case "start":
                  setProgressMessage(`开始生成: ${data.topic}`);
                  setProgressPercent(0);
                  break;

                case "progress":
                  const progress = data as GenerationProgress;
                  setProgressMessage(progress.message);
                  setProgressPercent(progress.progress);
                  break;

                case "complete":
                  if (data.success && data.data?.id) {
                    setProgressMessage("生成完成！");
                    setProgressPercent(100);
                    router.push(`/wiki/${data.data.id}`);
                  } else {
                    setError("生成失败：无效响应");
                    setLoading(false);
                  }
                  break;

                case "error":
                  setError(data.error || "生成失败，请重试");
                  setLoading(false);
                  break;
              }
            } catch (parseError) {
              console.error("Failed to parse SSE event:", parseError, eventData);
            }

            eventType = "";
            eventData = "";
          }
        }
      }
    } catch (err) {
      setError("网络错误: " + String(err));
      setLoading(false);
    }
  }, [topic, router]);

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
          <LoadingAnimation message={progressMessage} progress={progressPercent} />
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
              <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span>🔍</span>
                    <span>多源权威聚合</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    4 种数据源并行，最多 80 条参考来源，按可信度排序
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span>🧠</span>
                    <span>智能知识分类</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    自动识别知识点类型，针对性生成内容
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span>📊</span>
                    <span>Mermaid 图表</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    智能生成流程图、思维导图，可视化知识结构
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span>📝</span>
                    <span>4 层金字塔结构</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    直觉层 → 原理层 → 深入层 → 应用层
                  </p>
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
}
