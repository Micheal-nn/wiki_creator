import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { wikis, wikiSections } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { ApiResponse } from "@/types";

// GET /api/wikis/[id] — get single wiki with sections
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    const [wiki] = await db
      .select()
      .from(wikis)
      .where(eq(wikis.id, id))
      .limit(1);

    if (!wiki) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Wiki not found" },
        { status: 404 }
      );
    }

    const sections = await db
      .select()
      .from(wikiSections)
      .where(eq(wikiSections.wikiId, id));

    // Include sections in wiki object for frontend compatibility
    const wikiWithSections = {
      ...wiki,
      sections: sections,
    };

    return NextResponse.json({
      success: true,
      data: { wiki: wikiWithSections, sections },
    });
  } catch (error) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

// PATCH /api/wikis/[id] — update wiki content
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json() as Record<string, unknown>;
    const db = getDb();

    const updates: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };
    if (body.markdown !== undefined) updates.markdown = body.markdown;
    if (body.status !== undefined) updates.status = body.status;

    await db
      .update(wikis)
      .set(updates)
      .where(eq(wikis.id, id));

    return NextResponse.json<ApiResponse<{ id: string }>>({
      success: true,
      data: { id },
    });
  } catch (error) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

// DELETE /api/wikis/[id] — delete wiki and its sections
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    // Delete sections first (foreign key)
    const { searchResults } = await import("@/lib/db/schema");
    await db.delete(searchResults).where(eq(searchResults.wikiId, id));
    await db.delete(wikiSections).where(eq(wikiSections.wikiId, id));
    await db.delete(wikis).where(eq(wikis.id, id));

    return NextResponse.json<ApiResponse<{ id: string }>>({
      success: true,
      data: { id },
    });
  } catch (error) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
