"use client";

import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import "katex/dist/katex.min.css";

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

// Mermaid diagram block component
function MermaidBlock({ code }: { code: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState(false);

  // Sanitize mermaid code
  const sanitizeMermaidCode = (rawCode: string): string => {
    let sanitized = rawCode;
    
    // Fix common issues:
    // 1. Ensure proper newlines between statements
    sanitized = sanitized.replace(/\s*-->\s*/g, " --> ");
    sanitized = sanitized.replace(/\s*---\s*/g, " --- ");
    
    // 2. Escape quotes inside node labels
    sanitized = sanitized.replace(/\[([^\]]*)"/g, '[$1\\"');
    
    // 3. Remove trailing whitespace on lines
    sanitized = sanitized.split("\n").map(line => line.trimEnd()).join("\n");
    
    return sanitized;
  };

  useEffect(() => {
    async function renderMermaid() {
      try {
        await initMermaid();
        const mermaid = (await import("mermaid")).default;
        const sanitizedCode = sanitizeMermaidCode(code);
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const { svg } = await mermaid.render(id, sanitizedCode);
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
    // Show raw code block instead of error message for better UX
    return (
      <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto my-4">
        <code className="text-gray-800">{code}</code>
      </pre>
    );
  }

  if (!svg) {
    return (
      <div className="my-4 p-8 bg-gray-50 rounded-lg text-center animate-pulse">
        <span className="text-gray-400">📊 正在渲染图表...</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-4 flex justify-center overflow-x-auto bg-white p-4 rounded-lg border"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

// AI Image placeholder component
let globalImageIndex = 0;

function AIImagePlaceholder({ description }: { description: string }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [index] = useState(() => globalImageIndex++);

  const loadImage = useCallback(async () => {
    if (loading || imageUrl) return;
    setLoading(true);
    try {
      // CogView API can take up to 60 seconds
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);
      
      const res = await fetch("/api/charts/ai-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: description }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      const data = await res.json();
      if (data.success && data.data?.dataUrl) {
        setImageUrl(data.data.dataUrl);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error("[AI Image] Load error:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [description, loading, imageUrl]);

  // Lazy load with stagger
  useEffect(() => {
    const timer = setTimeout(loadImage, index * 500);
    return () => clearTimeout(timer);
  }, [loadImage, index]);

  if (error) {
    return (
      <div className="my-4 p-4 bg-gray-100 rounded-lg text-center text-gray-500 text-sm">
        [图片加载失败]
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

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Full-featured Markdown renderer with support for:
 * - GFM (GitHub Flavored Markdown): tables, strikethrough, task lists, etc.
 * - LaTeX math formulas: $...$ for inline, $$...$$ for block
 * - Syntax-highlighted code blocks
 * - HTML details/summary for collapsible sections
 */
export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  // Pre-process content to handle fold markers
  const processedContent = useMemo(() => {
    return content
      // Convert <!-- fold:start --> to <details><summary>
      .replace(
        /<!--\s*fold:start\s*-->/g,
        '<details class="my-4 border border-gray-200 rounded-lg"><summary class="px-4 py-2 bg-gray-50 cursor-pointer font-medium text-gray-700 hover:bg-gray-100">📋 点击展开详细内容</summary><div class="px-4 py-3">'
      )
      // Convert <!-- fold:end --> to closing tags
      .replace(/<!--\s*fold:end\s*-->/g, "</div></details>");
  }, [content]);

  return (
    <div className={`prose prose-slate max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeRaw]}
        components={{
          // Custom heading styles
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold mt-8 mb-4 text-gray-900 border-b pb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold mt-6 mb-3 text-gray-900">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold mt-4 mb-2 text-gray-800">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-semibold mt-3 mb-2 text-gray-800">
              {children}
            </h4>
          ),
          // Paragraph styling
          p: ({ children }) => (
            <p className="my-2 text-gray-800 leading-relaxed">{children}</p>
          ),
          // List styling
          ul: ({ children }) => (
            <ul className="list-disc list-outside ml-6 my-2 space-y-1 text-gray-800">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-outside ml-6 my-2 space-y-1 text-gray-800">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-gray-800 leading-relaxed">{children}</li>
          ),
          // Code block styling
          pre: ({ children, ...props }) => {
            // Check if this is a code block
            const child = children as React.ReactElement<{
              className?: string;
              children?: React.ReactNode;
            }>;
            const language = child?.props?.className?.replace("language-", "") || "";
            
            return (
              <pre
                className="bg-gray-900 text-gray-100 p-4 rounded-lg my-4 overflow-x-auto text-sm leading-relaxed"
                {...props}
              >
                {language && (
                  <div className="text-xs text-gray-400 mb-2 uppercase tracking-wide">
                    {language}
                  </div>
                )}
                {children}
              </pre>
            );
          },
          code: ({ className, children, ...props }) => {
            const isInline = !className;
            const match = /language-(\w+)/.exec(className || "");
            const language = match ? match[1] : "";
            
            // Handle mermaid code blocks
            if (language === "mermaid") {
              const code = String(children).replace(/\n$/, "");
              return <MermaidBlock code={code} />;
            }
            
            // Handle AI image placeholders
            if (language === "ai-image") {
              const description = String(children).replace(/\n$/, "");
              return <AIImagePlaceholder description={description} />;
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
          // Table styling
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto">
              <table className="min-w-full border-collapse border border-gray-300 rounded-lg overflow-hidden">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-100">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-900">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-gray-300 px-4 py-2 text-gray-800">
              {children}
            </td>
          ),
          // Blockquote styling
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-blue-500 pl-4 my-4 bg-blue-50 py-2 text-gray-700 italic">
              {children}
            </blockquote>
          ),
          // Strong and emphasis
          strong: ({ children }) => (
            <strong className="font-bold text-gray-900">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-gray-700">{children}</em>
          ),
          // Link styling
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              {children}
            </a>
          ),
          // Horizontal rule
          hr: () => <hr className="my-8 border-t border-gray-300" />,
          // Image styling
          img: ({ src, alt }) => (
            <img
              src={src}
              alt={alt || ""}
              className="max-w-full h-auto rounded-lg my-4 shadow-md"
            />
          ),
          // Details/summary (for fold sections)
          details: ({ children }) => (
            <details className="my-4 border border-gray-200 rounded-lg overflow-hidden">
              {children}
            </details>
          ),
          summary: ({ children }) => (
            <summary className="px-4 py-3 bg-gray-50 cursor-pointer font-medium text-gray-700 hover:bg-gray-100 transition-colors">
              {children}
            </summary>
          ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}
