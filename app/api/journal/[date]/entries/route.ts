import type { NextRequest } from "next/server";
import { verifyIdToken } from "../../../../../lib/firebase-admin";
import { getEntries, addEntry } from "../../../../../lib/entriesStore";
import {
  computeEntry,
  parseEntryInput,
  MEALS,
  type LogEntry,
  type Meal,
} from "../../../../../lib/entries";

type Ctx = { params: Promise<{ date: string }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  let uid: string;
  try {
    uid = await verifyIdToken(request);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

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
  let uid: string;
  try {
    uid = await verifyIdToken(request);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

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
