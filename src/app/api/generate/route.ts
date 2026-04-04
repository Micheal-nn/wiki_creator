import { NextResponse } from "next/server";
import { generateWiki } from "@/lib/wiki/generator";
import { getInitializedDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { ApiResponse } from "@/types";

// POST /api/generate — start wiki generation
export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      topic: string;
      userId?: string;
      apiKey?: string;
      tavilyApiKey?: string;
    };
    const { topic, userId: bodyUserId, apiKey, tavilyApiKey } = body;

    if (!topic) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Topic is required" },
        { status: 400 }
      );
    }

    const db = await getInitializedDb();
    
    // Get user from database (first user for single-user mode)
    const [dbUser] = await db.select().from(users).limit(1);
    if (!dbUser) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "No user found. Database may not be initialized." },
        { status: 500 }
      );
    }

    // Priority: request body > database > environment variable
    let glm5Key = apiKey;
    if (!glm5Key) {
      glm5Key = dbUser.apiKey || undefined;
    }
    if (!glm5Key) {
      glm5Key = process.env.GLM5_API_KEY;
    }

    let tavilyKey = tavilyApiKey;
    if (!tavilyKey) {
      tavilyKey = dbUser.tavilyApiKey || undefined;
    }
    if (!tavilyKey) {
      tavilyKey = process.env.TAVILY_API_KEY;
    }

    if (!glm5Key) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "GLM5 API Key 未配置。请访问设置页面配置。" },
        { status: 400 }
      );
    }

    if (!tavilyKey) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Tavily API Key 未配置。请访问设置页面配置。" },
        { status: 400 }
      );
    }

    // Use database user ID
    const userId = bodyUserId || dbUser.id;

    // Run wiki generation
    const result = await generateWiki(topic, userId, glm5Key, tavilyKey);

    return NextResponse.json<ApiResponse<typeof result>>({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Generate error:", error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
