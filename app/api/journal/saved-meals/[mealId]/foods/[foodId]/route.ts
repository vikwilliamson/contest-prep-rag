import type { NextRequest } from "next/server";
import { verifyIdToken } from "../../../../../../../lib/firebase-admin";
import { deleteSavedMealFood } from "../../../../../../../lib/savedMealsStore";

type Ctx = { params: Promise<{ mealId: string; foodId: string }> };

export async function DELETE(request: NextRequest, ctx: Ctx) {
  let uid: string;
  try {
    uid = await verifyIdToken(request);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { mealId, foodId } = await ctx.params;
  try {
    await deleteSavedMealFood(uid, mealId, foodId);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
