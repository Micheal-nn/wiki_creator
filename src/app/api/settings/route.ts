import { NextResponse } from "next/server";
import { getInitializedDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { ApiResponse } from "@/types";

// GET /api/settings — get user settings
export async function GET() {
  try {
    const db = await getInitializedDb();
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        apiProvider: users.apiProvider,
        preferences: users.preferences,
        hasApiKey: users.apiKey,
        hasTavilyKey: users.tavilyApiKey,
      })
      .from(users)
      .limit(1);

    if (!user) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "No user found" },
        { status: 404 }
      );
    }

    return NextResponse.json<
      ApiResponse<{ 
        id: string; 
        name: string; 
        apiProvider: string; 
        preferences: unknown; 
        hasApiKey: string | null;
        hasTavilyKey: string | null;
      }>
    >({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        apiProvider: user.apiProvider,
        preferences: user.preferences,
        hasApiKey: user.hasApiKey ? "****" : null,
        hasTavilyKey: user.hasTavilyKey ? "****" : null,
      },
    });
  } catch (error) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

// PATCH /api/settings — update user settings
export async function PATCH(request: Request) {
  try {
    const body = await request.json() as {
      apiKey?: string;
      tavilyApiKey?: string;
      apiProvider?: string;
      name?: string;
      preferences?: Record<string, unknown>;
    };
    const db = await getInitializedDb();

    const [user] = await db.select().from(users).limit(1);
    if (!user) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "No user found" },
        { status: 404 }
      );
    }

    const updates: Record<string, unknown> = {};
    if (body.apiKey !== undefined) updates.apiKey = body.apiKey;
    if (body.tavilyApiKey !== undefined) updates.tavilyApiKey = body.tavilyApiKey;
    if (body.apiProvider !== undefined) updates.apiProvider = body.apiProvider;
    if (body.name !== undefined) updates.name = body.name;
    if (body.preferences !== undefined) updates.preferences = body.preferences;

    if (Object.keys(updates).length > 0) {
      await db
        .update(users)
        .set(updates)
        .where(eq(users.id, user.id));
    }

    return NextResponse.json<ApiResponse<{ success: boolean }>>({
      success: true,
      data: { success: true },
    });
  } catch (error) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
