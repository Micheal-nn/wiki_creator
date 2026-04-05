"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MarkdownRenderer } from "@/components/markdown-renderer";

interface WikiSection {
  id: string;
  layer: number;
  title: string;
  markdown: string | null;
  order: number;
}

interface SourceMetadata {
  sourceType: string;
  sourceName: string;
  count: number;
  success: boolean;
  error?: string;
}

interface WikiData {
  id: string;
  topic: string;
  knowledgeType: string | null;
  status: string;
  markdown: string | null;
  createdAt: string;
  sections: WikiSection[];
  sourceMetadata?: SourceMetadata[];
  sourceWarnings?: string[];
}

interface SourceData {
  id: string;
  sourceType: string;
  sourceName: string;
  url: string;
  title: string;
  snippet: string;
  credibility: number;
  infoType: string;
}

const LAYER_CONFIG: Record<
  number,
  { name: string; icon: string; color: string; desc: string }
> = {
  1: {
    name: "直觉层",
    icon: "💡",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    desc: "10 秒理解",
  },
  2: {
    name: "原理层",
    icon: "🔬",
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    desc: "为什么能这样做",
  },
  3: {
    name: "深入层",
    icon: "📐",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    desc: "完整理解",
  },
  4: {
    name: "应用层",
    icon: "🚀",
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    desc: "怎么用",
  },
};

function SectionBlock({
  section,
  onRegenerate,
}: {
  section: WikiSection;
  onRegenerate: (id: string) => void;
}) {
  const config = LAYER_CONFIG[section.layer] || LAYER_CONFIG[1];
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="mb-8" id={`section-${section.id}`}>
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">{config.icon}</span>
        <Badge className={config.color}>
          Layer {section.layer}: {config.name}
        </Badge>
        <span className="text-sm text-muted-foreground">{config.desc}</span>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto"
          onClick={() => onRegenerate(section.id)}
        >
          重新生成
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? "展开" : "收起"}
        </Button>
      </div>

      {!collapsed && section.markdown && (
        <div className="bg-white border rounded-lg p-6 shadow-sm">
          <MarkdownRenderer content={section.markdown} />
        </div>
      )}
    </div>
  );
}

// Define all 4 expected sources
const EXPECTED_SOURCES = [
  { type: 'academic', name: 'Semantic Scholar', key: 'semanticScholar' },
  { type: 'academic', name: 'arXiv', key: 'arxiv' },
  { type: 'general', name: 'Tavily', key: 'tavily' },
  { type: 'llm', name: 'GLM5 知识库', key: 'llm' },
] as const;

function SourcesPanel({ 
  wikiId, 
  sourceMetadata,
  sourceWarnings 
}: { 
  wikiId: string;
  sourceMetadata?: SourceMetadata[];
  sourceWarnings?: string[];
}) {
  const [sources, setSources] = useState<SourceData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/wikis/${wikiId}/sources`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) setSources(res.data);
      })
      .finally(() => setLoading(false));
  }, [wikiId]);

  const credibilityColor = (score: number) => {
    if (score >= 5) return "bg-green-500";
    if (score >= 4) return "bg-blue-500";
    if (score >= 3) return "bg-yellow-500";
    if (score >= 2) return "bg-orange-500";
    return "bg-red-500";
  };

  if (loading) return <div className="p-4">加载中...</div>;

  // Group sources by type
  const grouped = {
    academic: sources.filter((s) => s.sourceType === "academic"),
    general: sources.filter((s) => s.sourceType === "general"),
    llm: sources.filter((s) => s.sourceType === "llm"),
  };

  // Build source status map from metadata
  const sourceStatusMap = new Map<string, { count: number; success: boolean; error?: string }>();
  if (sourceMetadata) {
    for (const meta of sourceMetadata) {
      sourceStatusMap.set(meta.sourceName, { count: meta.count, success: meta.success, error: meta.error });
    }
  }

  // Get label for source type
  const getTypeLabel = (type: string) => {
    switch (type) {
      case "academic": return "学术来源";
      case "general": return "通用来源";
      case "llm": return "LLM 知识库";
      default: return type;
    }
  };

  return (
    <ScrollArea className="h-[80vh]">
      <div className="p-4 space-y-4">
        {/* Display warnings at top */}
        {sourceWarnings && sourceWarnings.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <h4 className="font-medium text-yellow-800 mb-2">⚠️ 数据源提示</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              {sourceWarnings.map((warning, i) => (
                <li key={i}>• {warning}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Display sources by type - show all 4 categories */}
        {(["academic", "general", "llm"] as const).map((type) => {
          const items = grouped[type];
          const typeLabel = getTypeLabel(type);
          
          // Find metadata for sources of this type
          const relevantMetadata = sourceMetadata?.filter(m => m.sourceType === type) || [];
          
          return (
            <div key={type} className="border rounded-lg p-3">
              <h3 className="font-semibold mb-2 text-sm">
                {typeLabel}
                <span className="text-muted-foreground font-normal ml-1">
                  ({items.length} 条)
                </span>
              </h3>
              
              {items.length > 0 ? (
                <div className="space-y-2">
                  {items.map((source) => (
                    <div key={source.id} className="border rounded p-2 bg-gray-50">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`w-2 h-2 rounded-full ${credibilityColor(source.credibility)}`}
                        />
                        <span className="text-sm font-medium truncate flex-1">
                          {source.title}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                        {source.snippet}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {source.sourceName}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          可信度: {source.credibility}/5
                        </span>
                        {source.url && !source.url.startsWith('llm://') && (
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:underline ml-auto"
                          >
                            查看
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Show empty state with reason
                <div className="text-sm text-muted-foreground py-2">
                  {relevantMetadata.length > 0 ? (
                    relevantMetadata.map((meta, i) => (
                      <div key={i} className="flex items-center gap-2 text-orange-600">
                        <span>⚠️</span>
                        <span>{meta.sourceName}: {meta.error || '无相关结果'}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-orange-600">⚠️ 无数据源信息</span>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Source summary */}
        {sourceMetadata && (
          <div className="text-xs text-muted-foreground border-t pt-3 mt-3">
            <p>共 {sourceMetadata.reduce((sum, m) => sum + m.count, 0)} 条来源，
               {sourceMetadata.filter(m => m.success && m.count > 0).length}/4 个数据源有效</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

export default function WikiEditorPage() {
  const params = useParams();
  const router = useRouter();
  const wikiId = params.id as string;

  const [wiki, setWiki] = useState<WikiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [sourcesOpen, setSourcesOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/wikis/${wikiId}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setWiki(res.data.wiki || res.data);
        }
      })
      .finally(() => setLoading(false));
  }, [wikiId]);

  const handleRegenerate = useCallback(
    async (sectionId: string) => {
      setRegeneratingId(sectionId);
      try {
        const res = await fetch(`/api/sections/${sectionId}/regenerate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wikiId }),
        });
        const data = await res.json();
        if (data.success) {
          // Refresh wiki data
          const refresh = await fetch(`/api/wikis/${wikiId}`);
          const refreshData = await refresh.json();
          if (refreshData.success && refreshData.data) {
            setWiki(refreshData.data.wiki || refreshData.data);
          }
        } else {
          alert(data.error || "重新生成失败");
        }
      } catch (error) {
        alert("网络错误: " + String(error));
      } finally {
        setRegeneratingId(null);
      }
    },
    [wikiId]
  );

  const handleExport = () => {
    window.open(`/api/export/${wikiId}`, "_blank");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <div className="w-64 border-r p-4">
          <Skeleton className="h-6 w-32 mb-4" />
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-8 w-full mb-2" />
          ))}
        </div>
        <div className="flex-1 p-8">
          <Skeleton className="h-10 w-64 mb-6" />
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full mb-4" />
          ))}
        </div>
      </div>
    );
  }

  if (!wiki) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg">Wiki 未找到</p>
          <Button variant="link" onClick={() => router.push("/")}>
            返回首页
          </Button>
        </div>
      </div>
    );
  }

  const sections = wiki.sections || [];
  const sortedSections = [...sections].sort((a, b) => a.layer - b.layer);

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left: Outline Navigation - Fixed sidebar */}
      <div className="fixed left-0 top-0 h-screen w-64 border-r p-4 flex flex-col bg-gray-50 z-20 overflow-y-auto">
        <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">
          内容大纲
        </h3>
        <nav className="flex-1 space-y-1">
          {sortedSections.map((section) => {
            const config = LAYER_CONFIG[section.layer];
            return (
              <button
                key={section.id}
                onClick={() =>
                  document
                    .getElementById(`section-${section.id}`)
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-colors text-sm flex items-center gap-2"
              >
                <span>{config?.icon}</span>
                <span className="truncate">{section.title}</span>
              </button>
            );
          })}
        </nav>

        <Separator className="my-3" />

        {/* 信息来源按钮 */}
        <Button
          variant="outline"
          size="sm"
          className="w-full border-gray-300 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium"
          onClick={() => setSourcesOpen(true)}
        >
          📎 查看信息来源
        </Button>

        <Sheet open={sourcesOpen} onOpenChange={setSourcesOpen}>
          <SheetContent side="right" className="w-[400px] sm:max-w-[400px]">
            <SheetHeader>
              <SheetTitle>信息来源</SheetTitle>
            </SheetHeader>
            <SourcesPanel 
              wikiId={wikiId} 
              sourceMetadata={wiki.sourceMetadata}
              sourceWarnings={wiki.sourceWarnings}
            />
          </SheetContent>
        </Sheet>

        <Separator className="my-3" />
        <Button
          variant="outline"
          size="sm"
          className="w-full border-gray-300"
          onClick={() => router.push("/")}
        >
          ← 返回首页
        </Button>
      </div>

      {/* Right: Content - Add margin-left to account for fixed sidebar */}
      <div className="flex-1 flex flex-col ml-64">
        {/* Header bar - Sticky header */}
        <header className="sticky top-0 bg-white border-b px-6 py-3 flex items-center gap-4 z-10 shadow-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/")}
            className="text-gray-600 hover:text-gray-900"
          >
            ← 返回
          </Button>
          <h1 className="text-xl font-bold text-gray-900">{wiki.topic}</h1>
          {wiki.knowledgeType && (
            <Badge variant="outline">{wiki.knowledgeType}</Badge>
          )}
          <div className="ml-auto flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-gray-300 bg-white hover:bg-gray-100 h-9 px-4 py-2 cursor-pointer">
                导出 ▼
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleExport}>
                  导出 Markdown (.md)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content area */}
        <ScrollArea className="flex-1">
          <div className="max-w-5xl mx-auto py-8 px-8">
            {sortedSections.map((section) => (
              <SectionBlock
                key={section.id}
                section={section}
                onRegenerate={handleRegenerate}
              />
            ))}

            {sortedSections.length === 0 && wiki.status === "generating" && (
              <div className="text-center py-16">
                <p className="text-lg mb-2">正在生成 Wiki...</p>
                <p className="text-muted-foreground">
                  这可能需要几分钟，请耐心等待
                </p>
              </div>
            )}

            {sortedSections.length === 0 && wiki.status === "error" && (
              <div className="text-center py-16">
                <p className="text-lg mb-2 text-red-500">生成失败</p>
                <Button onClick={() => router.push("/")}>返回重试</Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
