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

// Dormant while auth is disabled (see lib/auth-context.tsx / proxy.ts). Kept for
// when token-based auth is re-enabled.
export async function verifyIdToken(request: NextRequest): Promise<string> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) throw new AuthError("Missing auth token");

  await ensureAdminApp();
  const { getAuth } = await import("firebase-admin/auth");

  const decoded = await getAuth().verifyIdToken(token);
  return decoded.uid;
}
