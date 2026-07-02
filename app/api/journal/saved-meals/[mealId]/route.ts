import type { NextRequest } from "next/server";
import { verifyIdToken } from "../../../../../lib/firebase-admin";
import { renameSavedMeal, deleteSavedMeal } from "../../../../../lib/savedMealsStore";

type Ctx = { params: Promise<{ mealId: string }> };

export async function PATCH(request: NextRequest, ctx: Ctx) {
  let uid: string;
  try {
    uid = await verifyIdToken(request);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { mealId } = await ctx.params;

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
    await renameSavedMeal(uid, mealId, name);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  let uid: string;
  try {
    uid = await verifyIdToken(request);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { mealId } = await ctx.params;
  try {
    await deleteSavedMeal(uid, mealId);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
