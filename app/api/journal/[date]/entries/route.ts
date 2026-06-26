import type { NextRequest } from "next/server";
import { getEntries, addEntry } from "../../../../../lib/entriesStore";
import {
  computeEntry,
  parseEntryInput,
  MEALS,
  type LogEntry,
  type Meal,
} from "../../../../../lib/entries";

// Auth is temporarily disabled (gated by proxy.ts), so the 401 criterion is
// intentionally skipped, matching the other journal routes. Entries are scoped
// to a single local user.
const uid = "anonymous";

type Ctx = { params: Promise<{ date: string }> };

export async function GET(_request: NextRequest, ctx: Ctx) {
  const { date } = await ctx.params;
  try {
    const entries = await getEntries(uid, date);
    const grouped = Object.fromEntries(MEALS.map((m) => [m, []])) as Record<
      Meal,
      LogEntry[]
    >;
    for (const e of entries) grouped[e.meal].push(e);
    return Response.json({ entries: grouped });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, ctx: Ctx) {
  const { date } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const input = parseEntryInput(body);
  if (!input) {
    return Response.json({ error: "Invalid entry payload" }, { status: 400 });
  }

  try {
    const entry = await addEntry(uid, date, computeEntry(input));
    return Response.json({ entry });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
