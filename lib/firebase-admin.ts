import type { NextRequest } from "next/server";
import type { Firestore } from "firebase-admin/firestore";

class AuthError extends Error {}

async function ensureAdminApp(): Promise<void> {
  const { getApps, initializeApp, cert } = await import("firebase-admin/app");

  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  }
}

export async function getAdminDb(): Promise<Firestore> {
  await ensureAdminApp();
  const { getFirestore } = await import("firebase-admin/firestore");
  return getFirestore();
}

/**
 * Verifies the request's Firebase ID token and returns its uid.
 *
 * When ALLOWED_UIDS is set (comma-separated), only those uids are accepted —
 * the whitelist lives here rather than in Firebase Security Rules because all
 * data access goes through Admin SDK routes, which bypass Rules entirely.
 * Throws on any failure; routes map that to a 401.
 */
export async function verifyIdToken(request: NextRequest): Promise<string> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) throw new AuthError("Missing auth token");

  await ensureAdminApp();
  const { getAuth } = await import("firebase-admin/auth");

  const decoded = await getAuth().verifyIdToken(token);

  const allowed = (process.env.ALLOWED_UIDS ?? "")
    .split(",")
    .map((uid) => uid.trim())
    .filter(Boolean);
  if (allowed.length > 0 && !allowed.includes(decoded.uid)) {
    throw new AuthError("UID not in allow list");
  }

  return decoded.uid;
}
