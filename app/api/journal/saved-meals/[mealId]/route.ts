import type { NextRequest } from "next/server";
import { renameSavedMeal, deleteSavedMeal } from "../../../../../lib/savedMealsStore";

const uid = "anonymous";

type Ctx = { params: Promise<{ mealId: string }> };

export async function PATCH(request: NextRequest, ctx: Ctx) {
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

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const { mealId } = await ctx.params;
  try {
    await deleteSavedMeal(uid, mealId);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
