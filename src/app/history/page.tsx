"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface WikiListItem {
  id: string;
  topic: string;
  knowledgeType: string | null;
  status: string;
  createdAt: string;
}

export default function HistoryPage() {
  const router = useRouter();
  const [wikis, setWikis] = useState<WikiListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/wikis")
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) setWikis(res.data);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    await fetch(`/api/wikis/${id}`, { method: "DELETE" });
    setWikis((prev) => prev.filter((w) => w.id !== id));
    setDeleteId(null);
  }

  const filtered = search
    ? wikis.filter((w) =>
        w.topic.toLowerCase().includes(search.toLowerCase())
      )
    : wikis;

  return (
    <main className="min-h-screen">
      <header className="border-b px-6 py-4 flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push("/")}>
          ← 返回
        </Button>
        <h1 className="text-xl font-bold">历史记录</h1>
      </header>

      <div className="max-w-4xl mx-auto py-8 px-6">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索知识点..."
          className="mb-6"
        />

        {loading ? (
          <p>加载中...</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground">
            {search ? "没有匹配的结果" : "还没有生成过 Wiki"}
          </p>
        ) : (
          <div className="space-y-3">
            {filtered.map((wiki) => (
              <Card
                key={wiki.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div
                    className="flex-1"
                    onClick={() => router.push(`/wiki/${wiki.id}`)}
                  >
                    <div className="font-medium">{wiki.topic}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${
                          wiki.status === "ready"
                            ? "bg-green-500"
                            : wiki.status === "error"
                              ? "bg-red-500"
                              : "bg-yellow-500"
                        }`}
                      />
                      <span>
                        {wiki.status === "ready"
                          ? "已完成"
                          : wiki.status === "error"
                            ? "出错"
                            : "生成中"}
                      </span>
                      {wiki.knowledgeType && (
                        <Badge variant="outline" className="text-xs">
                          {wiki.knowledgeType}
                        </Badge>
                      )}
                      <span className="ml-auto text-xs">
                        {wiki.createdAt?.slice(0, 10)}
                      </span>
                    </div>
                  </div>

                  <Dialog
                    open={deleteId === wiki.id}
                    onOpenChange={(open) => !open && setDeleteId(null)}
                  >
                    <DialogTrigger>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(wiki.id);
                        }}
                      >
                        删除
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>确认删除</DialogTitle>
                      </DialogHeader>
                      <p>
                        确定要删除「{wiki.topic}」吗？此操作不可撤销。
                      </p>
                      <div className="flex gap-2 justify-end mt-4">
                        <Button
                          variant="outline"
                          onClick={() => setDeleteId(null)}
                        >
                          取消
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleDelete(wiki.id)}
                        >
                          确认删除
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
