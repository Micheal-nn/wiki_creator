import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { searchResults } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { ApiResponse } from "@/types";

// GET /api/wikis/[id]/sources — get search sources for a wiki
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    const results = await db
      .select()
      .from(searchResults)
      .where(eq(searchResults.wikiId, id));

    return NextResponse.json<ApiResponse<typeof results>>({
      success: true,
      data: results,
    });
  } catch (error) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
