import type { NextRequest } from "next/server";
import { listSavedMealFoods, addSavedMealFood } from "../../../../../../lib/savedMealsStore";
import { parseSavedMealFoodInput, computeSavedMealFood } from "../../../../../../lib/savedMeals";

const uid = "anonymous";

type Ctx = { params: Promise<{ mealId: string }> };

export async function GET(_request: NextRequest, ctx: Ctx) {
  const { mealId } = await ctx.params;
  try {
    const foods = await listSavedMealFoods(uid, mealId);
    return Response.json({ foods });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, ctx: Ctx) {
  const { mealId } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const input = parseSavedMealFoodInput(body);
  if (!input) {
    return Response.json({ error: "Invalid food payload" }, { status: 400 });
  }

  try {
    const food = await addSavedMealFood(uid, mealId, computeSavedMealFood(input));
    return Response.json({ food });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
