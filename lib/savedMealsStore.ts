import { getAdminDb } from "./firebase-admin";
import type { SavedMeal, SavedMealFood, NewSavedMealFood } from "./savedMeals";

async function savedMealsColl(uid: string) {
  const db = await getAdminDb();
  return db.collection("users").doc(uid).collection("savedMeals");
}

async function foodsColl(uid: string, mealId: string) {
  const coll = await savedMealsColl(uid);
  return coll.doc(mealId).collection("foods");
}

export async function listSavedMeals(uid: string): Promise<SavedMeal[]> {
  const coll = await savedMealsColl(uid);
  const snap = await coll.get();
  return snap.docs.map((d) => ({ id: d.id, name: (d.data() as { name: string }).name }));
}

export async function createSavedMeal(uid: string, name: string): Promise<SavedMeal> {
  const coll = await savedMealsColl(uid);
  const ref = await coll.add({ name, createdAt: new Date() });
  return { id: ref.id, name };
}

export async function renameSavedMeal(uid: string, mealId: string, name: string): Promise<void> {
  const coll = await savedMealsColl(uid);
  await coll.doc(mealId).update({ name });
}

export async function deleteSavedMeal(uid: string, mealId: string): Promise<void> {
  const coll = await savedMealsColl(uid);
  await coll.doc(mealId).delete();
}

export async function listSavedMealFoods(uid: string, mealId: string): Promise<SavedMealFood[]> {
  const coll = await foodsColl(uid, mealId);
  const snap = await coll.get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as NewSavedMealFood) }));
}

export async function addSavedMealFood(
  uid: string,
  mealId: string,
  food: NewSavedMealFood
): Promise<SavedMealFood> {
  const coll = await foodsColl(uid, mealId);
  const ref = await coll.add(food);
  return { id: ref.id, ...food };
}

export async function deleteSavedMealFood(
  uid: string,
  mealId: string,
  foodId: string
): Promise<void> {
  const coll = await foodsColl(uid, mealId);
  await coll.doc(foodId).delete();
}
