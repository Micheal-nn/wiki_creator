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
  /** External message from SSE progress events */
  message?: string;
  /** External progress percentage (0-100) */
  progress?: number;
}

export function LoadingAnimation({
  steps = DEFAULT_LOADING_STEPS,
  interval = 4000,
  message,
  progress,
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

  // Use external message if provided, otherwise use step text
  const displayText = message || steps[currentStepIndex];
  // Use external progress if provided (0-100), otherwise undefined for animated bar
  const progressPercent = progress !== undefined ? progress : undefined;

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
            isVisible || message ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}
        >
          {displayText}
        </p>
      </div>

      {/* Progress bar - static if progress provided, animated otherwise */}
      <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden mb-8">
        {progressPercent !== undefined ? (
          <div 
            className="h-full bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        ) : (
          <div className="h-full bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 rounded-full animate-progress" />
        )}
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
