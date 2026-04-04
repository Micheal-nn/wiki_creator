"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function SettingsPage() {
  const router = useRouter();
  const [glm5ApiKey, setGlm5ApiKey] = useState("");
  const [tavilyApiKey, setTavilyApiKey] = useState("");
  const [showGlm5Key, setShowGlm5Key] = useState(false);
  const [showTavilyKey, setShowTavilyKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasGlm5Key, setHasGlm5Key] = useState(false);
  const [hasTavilyKey, setHasTavilyKey] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setHasGlm5Key(!!res.data.hasApiKey);
          setHasTavilyKey(!!res.data.hasTavilyKey);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    const updates: Record<string, string> = {};
    if (glm5ApiKey) updates.apiKey = glm5ApiKey;
    if (tavilyApiKey) updates.tavilyApiKey = tavilyApiKey;

    if (Object.keys(updates).length === 0) return;

    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });

    const data = await res.json();
    if (data.success) {
      setSaved(true);
      setGlm5ApiKey("");
      setTavilyApiKey("");
      if (glm5ApiKey) setHasGlm5Key(true);
      if (tavilyApiKey) setHasTavilyKey(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p>加载中...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <header className="border-b px-6 py-4 flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push("/")}>
          ← 返回
        </Button>
        <h1 className="text-xl font-bold">设置</h1>
      </header>

      <div className="max-w-lg mx-auto py-8 px-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>API Key 配置</CardTitle>
            <CardDescription>
              配置以下 API Key 后即可开始使用
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* GLM5 API Key */}
            <div>
              <label className="text-sm font-medium mb-1 flex items-center gap-2">
                GLM5 API Key
                {hasGlm5Key && <span className="text-xs text-green-600">✓ 已配置</span>}
              </label>
              <div className="flex gap-2">
                <Input
                  type={showGlm5Key ? "text" : "password"}
                  value={glm5ApiKey}
                  onChange={(e) => setGlm5ApiKey(e.target.value)}
                  placeholder={hasGlm5Key ? "输入新 Key 以更新" : "输入你的 GLM5 API Key"}
                />
                <Button
                  variant="outline"
                  onClick={() => setShowGlm5Key(!showGlm5Key)}
                >
                  {showGlm5Key ? "隐藏" : "显示"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                获取地址：<a href="https://open.bigmodel.cn/" target="_blank" className="text-blue-500 hover:underline">智谱 AI 开放平台</a>
              </p>
            </div>

            {/* Tavily API Key */}
            <div>
              <label className="text-sm font-medium mb-1 flex items-center gap-2">
                Tavily API Key
                {hasTavilyKey && <span className="text-xs text-green-600">✓ 已配置</span>}
              </label>
              <div className="flex gap-2">
                <Input
                  type={showTavilyKey ? "text" : "password"}
                  value={tavilyApiKey}
                  onChange={(e) => setTavilyApiKey(e.target.value)}
                  placeholder={hasTavilyKey ? "输入新 Key 以更新" : "输入你的 Tavily API Key"}
                />
                <Button
                  variant="outline"
                  onClick={() => setShowTavilyKey(!showTavilyKey)}
                >
                  {showTavilyKey ? "隐藏" : "显示"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                获取地址：<a href="https://tavily.com/" target="_blank" className="text-blue-500 hover:underline">tavily.com</a>（免费）
              </p>
            </div>

            <Button 
              onClick={handleSave} 
              disabled={(!glm5ApiKey && !tavilyApiKey) || saved}
              className="w-full"
            >
              {saved ? "已保存 ✓" : "保存配置"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>关于</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Wiki Creator — 输入知识点，自动搜索学术、技术、通用多源信息，
              结合大模型生成由浅入深的 4 层金字塔结构 Wiki，图文结合，深入浅出。
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
