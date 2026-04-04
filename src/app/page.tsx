"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LoadingAnimation } from "@/components/loading-animation";

export default function HomePage() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (!topic.trim()) {
      setError("请输入知识点");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim() }),
      });

      const data = await res.json();

      if (data.success && data.data?.id) {
        router.push(`/wiki/${data.data.id}`);
      } else {
        setError(data.error || "生成失败，请重试");
        setLoading(false);
      }
    } catch (err) {
      setError("网络错误: " + String(err));
      setLoading(false);
    }
  }

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
}
