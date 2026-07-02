import type { NextRequest } from "next/server";
import { deleteSavedMealFood } from "../../../../../../../lib/savedMealsStore";

const uid = "anonymous";

type Ctx = { params: Promise<{ mealId: string; foodId: string }> };

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const { mealId, foodId } = await ctx.params;
  try {
    await deleteSavedMealFood(uid, mealId, foodId);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
