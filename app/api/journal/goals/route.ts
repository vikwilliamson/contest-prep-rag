import type { NextRequest } from "next/server";
import { verifyIdToken } from "../../../../lib/firebase-admin";
import { getGoals, saveGoals } from "../../../../lib/goalsStore";
import { parseGoals } from "../../../../lib/goals";

export async function GET(request: NextRequest) {
  let uid: string;
  try {
    uid = await verifyIdToken(request);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const goals = await getGoals(uid);
    return Response.json({ goals });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  let uid: string;
  try {
    uid = await verifyIdToken(request);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

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
