interface CogViewRequest {
  model: "cogview-3";
  prompt: string;
  size?: "1024x1024" | "768x768" | "512x512";
}

interface CogViewResponse {
  created: number;
  data: Array<{
    url?: string;
    b64_json?: string;
  }>;
}

/**
 * Generate an image using CogView API (智谱 AI)
 * Uses the same API key as GLM5
 */
export async function generateImage(
  prompt: string,
  apiKey: string,
  size: "1024x1024" | "768x768" | "512x512" = "1024x1024"
): Promise<{ success: boolean; dataUrl?: string; error?: string }> {
  const apiUrl = "https://open.bigmodel.cn/api/paas/v4/images/generations";

  try {
    console.log("[CogView] Generating image for prompt:", prompt.slice(0, 100));
    
    // CogView API can take up to 60 seconds, set timeout to 90s
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);
    
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "cogview-3",
        prompt: `为维基百科文章生成配图：${prompt}`,
        size,
      } as CogViewRequest),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[CogView] API error:", response.status, errorText);
      return {
        success: false,
        error: `CogView API error: ${response.status}`,
      };
    }

    const result: CogViewResponse = await response.json();
    console.log("[CogView] Response received:", result);

    if (result.data && result.data.length > 0) {
      const imageData = result.data[0];

      // Prefer base64 data URL
      if (imageData.b64_json) {
        return {
          success: true,
          dataUrl: `data:image/png;base64,${imageData.b64_json}`,
        };
      }

      // Fallback to URL
      if (imageData.url) {
        return {
          success: true,
          dataUrl: imageData.url,
        };
      }
    }

    return {
      success: false,
      error: "No image data returned",
    };
  } catch (error) {
    console.error("[CogView] Error:", error);
    const errorMessage = error instanceof Error && error.name === 'AbortError' 
      ? "图片生成超时，请稍后重试" 
      : String(error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}
