import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { wikis } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import type { ApiResponse } from "@/types";

// GET /api/wikis — list all wikis
export async function GET() {
  try {
    const db = getDb();
    const allWikis = await db
      .select({
        id: wikis.id,
        topic: wikis.topic,
        knowledgeType: wikis.knowledgeType,
        status: wikis.status,
        createdAt: wikis.createdAt,
        updatedAt: wikis.updatedAt,
      })
      .from(wikis)
      .orderBy(desc(wikis.createdAt));

    return NextResponse.json<ApiResponse<typeof allWikis>>({
      success: true,
      data: allWikis,
    });
  } catch (error) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

// POST /api/wikis — create a new wiki (draft)
export async function POST(request: Request) {
  try {
    const body = await request.json() as { topic: string; userId: string };
    const { topic, userId } = body;

    if (!topic) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Topic is required" },
        { status: 400 }
      );
    }

    const db = getDb();
    const { v4: uuid } = await import("uuid");
    const id = uuid();

    await db.insert(wikis).values({
      id,
      userId: userId || "default",
      topic,
      status: "draft",
    });

    return NextResponse.json<ApiResponse<{ id: string }>>(
      { success: true, data: { id } },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
