import { getAdminDb } from "./firebase-admin";
import type { Goals } from "./goals";

export type { Goals };

// Single goals document per user: users/{uid}/journal/goals
async function goalsDocRef(uid: string) {
  const db = await getAdminDb();
  return db.collection("users").doc(uid).collection("journal").doc("goals");
}

export async function getGoals(uid: string): Promise<Goals | null> {
  const snap = await (await goalsDocRef(uid)).get();
  return snap.exists ? (snap.data() as Goals) : null;
}

export async function saveGoals(uid: string, goals: Goals): Promise<void> {
  await (await goalsDocRef(uid)).set(goals);
}
