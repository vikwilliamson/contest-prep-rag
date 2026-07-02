import type { NextRequest } from "next/server";
import { verifyIdToken } from "../../../../../../lib/firebase-admin";
import { deleteEntry } from "../../../../../../lib/entriesStore";

type Ctx = { params: Promise<{ date: string; entryId: string }> };

export async function DELETE(request: NextRequest, ctx: Ctx) {
  let uid: string;
  try {
    uid = await verifyIdToken(request);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { date, entryId } = await ctx.params;
  try {
    await deleteEntry(uid, date, entryId);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
