import { NextResponse } from "next/server";
import { generateImage } from "@/lib/charts/cogview-renderer";
import { getInitializedDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { ApiResponse } from "@/types";

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      prompt: string;
      size?: "1024x1024" | "768x768" | "512x512";
    };

    const { prompt, size = "1024x1024" } = body;

    if (!prompt) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Get API key from database or environment
    const db = await getInitializedDb();
    const [dbUser] = await db.select().from(users).limit(1);

    let apiKey = dbUser?.apiKey || process.env.GLM5_API_KEY;

    if (!apiKey) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "GLM5 API Key 未配置" },
        { status: 400 }
      );
    }

    const result = await generateImage(prompt, apiKey, size);

    if (!result.success) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: result.error || "Image generation failed" },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<{ dataUrl: string }>>({
      success: true,
      data: { dataUrl: result.dataUrl! },
    });
  } catch (error) {
    console.error("[AI Image API] Error:", error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
