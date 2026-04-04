"use client";

import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import "katex/dist/katex.min.css";

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
