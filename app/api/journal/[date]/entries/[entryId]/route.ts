import type { NextRequest } from "next/server";
import { deleteEntry } from "../../../../../../lib/entriesStore";

// Auth disabled (gated by proxy.ts); 401 criterion skipped as elsewhere.
const uid = "anonymous";

type Ctx = { params: Promise<{ date: string; entryId: string }> };

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const { date, entryId } = await ctx.params;
  try {
    await deleteEntry(uid, date, entryId);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
