import type { NextRequest } from "next/server";
import { getGoals, saveGoals } from "../../../../lib/goalsStore";
import { parseGoals } from "../../../../lib/goals";

// Auth is temporarily disabled (gated by proxy.ts). Goals are scoped to a
// single local user. Restore per-user uid when re-enabling auth.
const uid = "anonymous";

export async function GET() {
  try {
    const goals = await getGoals(uid);
    return Response.json({ goals });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const goals = parseGoals(body);
  if (!goals) {
    return Response.json({ error: "Invalid goals payload" }, { status: 400 });
  }

  try {
    await saveGoals(uid, goals);
    return Response.json({ goals });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
