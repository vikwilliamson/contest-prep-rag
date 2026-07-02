import type { NextRequest } from "next/server";
import { verifyIdToken } from "../../../../lib/firebase-admin";
import { listSavedMeals, createSavedMeal } from "../../../../lib/savedMealsStore";

export async function GET(request: NextRequest) {
  let uid: string;
  try {
    uid = await verifyIdToken(request);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const meals = await listSavedMeals(uid);
    return Response.json({ meals });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

  const name =
    typeof (body as Record<string, unknown>)?.name === "string"
      ? ((body as Record<string, unknown>).name as string).trim()
      : "";

  if (!name) {
    return Response.json({ error: "name is required" }, { status: 400 });
  }

  try {
    const meal = await createSavedMeal(uid, name);
    return Response.json({ meal });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
