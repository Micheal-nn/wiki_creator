/**
 * Translation service for converting Chinese queries to English
 * Uses GLM5 API for accurate, dynamic translation
 */

const GLM5_API_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
const TRANSLATION_TIMEOUT_MS = 15_000; // 15 seconds for translation

/**
 * Check if text contains Chinese characters
 */
export function containsChinese(text: string): boolean {
  // Unicode range for Chinese characters
  return /[\u4e00-\u9fff]/.test(text);
}

/**
 * Translate Chinese text to English using GLM5 API
 * Falls back to original text if translation fails
 */
export async function translateToEnglish(
  text: string,
  apiKey: string
): Promise<string> {
  // Skip translation if not Chinese
  if (!containsChinese(text)) {
    return text;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TRANSLATION_TIMEOUT_MS);

  try {
    console.log(`[Translate] Translating "${text}" to English...`);
    
    const response = await fetch(GLM5_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "glm-4-flash",
        messages: [
          {
            role: "system",
            content: "You are a professional translator for academic and technical content. Translate the given Chinese text to English. Return ONLY the English translation, nothing else.",
          },
          {
            role: "user",
            content: text,
          },
        ],
        temperature: 0.3,
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      console.warn(`[Translate] API error: ${response.status}`);
      return text; // Fallback to original
    }

    const data = await response.json();
    const translated = data.choices?.[0]?.message?.content?.trim() || "";
    
    if (translated) {
      console.log(`[Translate] Translated to: "${translated}"`);
      return translated;
    }
    
    return text; // Fallback to original
  } catch (error) {
    console.warn(`[Translate] Translation failed:`, error);
    return text; // Fallback to original
  } finally {
    clearTimeout(timer);
  }
}
