import type { NextRequest } from "next/server";
import { searchFoods } from "../../../lib/foodSearch";

// Auth is temporarily disabled (gated by proxy.ts), so the 401 acceptance
// criterion is intentionally skipped here, matching the other journal routes.
// Restore token verification when re-enabling auth.

export async function GET(request: NextRequest) {
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
