// Firestore persistence for daily log entries:
// users/{uid}/logs/{date}/entries/{id}. Each entry is an immutable snapshot —
// only add and delete, never update (issue #6, [[feedback-atomic-ops]]).

import { getAdminDb } from "./firebase-admin";
import type { LogEntry, NewLogEntry } from "./entries";

async function entriesColl(uid: string, date: string) {
  const db = await getAdminDb();
  return db
    .collection("users")
    .doc(uid)
    .collection("logs")
    .doc(date)
    .collection("entries");
}

export async function getEntries(uid: string, date: string): Promise<LogEntry[]> {
  const coll = await entriesColl(uid, date);
  const snap = await coll.orderBy("loggedAt").get();
  return snap.docs.map((d) => {
    const { loggedAt: _loggedAt, ...rest } = d.data() as NewLogEntry & {
      loggedAt?: unknown;
    };
    return { id: d.id, ...rest };
  });
}

export async function addEntry(
  uid: string,
  date: string,
  entry: NewLogEntry
): Promise<LogEntry> {
  const coll = await entriesColl(uid, date);
  const ref = await coll.add({ ...entry, loggedAt: new Date() });
  return { id: ref.id, ...entry };
}

export async function deleteEntry(
  uid: string,
  date: string,
  entryId: string
): Promise<void> {
  const coll = await entriesColl(uid, date);
  await coll.doc(entryId).delete();
}
