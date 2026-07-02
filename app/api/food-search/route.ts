import type { NextRequest } from "next/server";
import { verifyIdToken } from "../../../lib/firebase-admin";
import { searchFoods } from "../../../lib/foodSearch";

export async function GET(request: NextRequest) {
  try {
    await verifyIdToken(request);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return Response.json({ error: "Missing query" }, { status: 400 });
  }

  try {
    const results = await searchFoods(q);
    return Response.json({ results });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
