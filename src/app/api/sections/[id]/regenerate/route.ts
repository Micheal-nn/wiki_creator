import { NextResponse } from "next/server";
import { regenerateSection } from "@/lib/wiki/generator";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { ApiResponse } from "@/types";

// POST /api/sections/[id]/regenerate — regenerate a single section
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json() as {
      wikiId: string;
      apiKey?: string;
    };
    const { wikiId, apiKey } = body;

    if (!wikiId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "wikiId is required" },
        { status: 400 }
      );
    }

    // Priority: request body > database > environment variable
    let key = apiKey;
    if (!key) {
      const db = getDb();
      const [user] = await db.select({ apiKey: users.apiKey }).from(users).limit(1);
      key = user?.apiKey || undefined;
    }
    if (!key) {
      key = process.env.GLM5_API_KEY;
    }

    if (!key) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "API key required. Please set GLM5 API Key in Settings page." },
        { status: 400 }
      );
    }

    const newSection = await regenerateSection(wikiId, id, key);

    return NextResponse.json<ApiResponse<typeof newSection>>({
      success: true,
      data: newSection,
    });
  } catch (error) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
