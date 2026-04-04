import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { wikis, wikiSections, searchResults } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { exportMarkdown } from "@/lib/wiki/generator";

// GET /api/export/[id] — export wiki as markdown file download
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
      return NextResponse.json({ error: "Wiki not found" }, { status: 404 });
    }

    const markdown = exportMarkdown(wiki);
    const filename = `${wiki.topic.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, "_")}.md`;

    return new NextResponse(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
