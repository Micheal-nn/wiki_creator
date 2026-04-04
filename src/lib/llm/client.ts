const GLM5_BASE_URL =
  process.env.GLM5_BASE_URL || "https://open.bigmodel.cn/api/paas/v4";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatCompletionResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function chatCompletion(
  apiKey: string,
  messages: ChatMessage[],
  options?: ChatCompletionOptions
): Promise<ChatCompletionResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);

  try {
    const response = await fetch(`${GLM5_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: options?.model || "glm-4-plus",
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 4096,
      }),
      signal: controller.signal,
    });

    if (response.status === 401) {
      throw new Error("Invalid API key");
    }

    if (response.status === 429) {
      // Rate limited — retry once after delay
      await new Promise((r) => setTimeout(r, 2000));
      const retryResponse = await fetch(`${GLM5_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: options?.model || "glm-4-plus",
          messages,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 4096,
        }),
      });
      if (!retryResponse.ok) {
        throw new Error(`GLM5 API error after retry: ${retryResponse.status}`);
      }
      const retryData = await retryResponse.json();
      return {
        content: retryData.choices?.[0]?.message?.content ?? "",
        usage: retryData.usage,
      };
    }

    if (!response.ok) {
      throw new Error(`GLM5 API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.choices?.[0]?.message?.content ?? "",
      usage: data.usage,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function chatCompletionStream(
  apiKey: string,
  messages: ChatMessage[],
  onChunk: (chunk: string) => void,
  options?: ChatCompletionOptions
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);

  try {
    const response = await fetch(`${GLM5_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: options?.model || "glm-4-plus",
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 4096,
        stream: true,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`GLM5 API error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let fullContent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullContent += content;
              onChunk(content);
            }
          } catch {
            // Skip malformed SSE lines
          }
        }
      }
    }

    return fullContent;
  } finally {
    clearTimeout(timer);
  }
}
