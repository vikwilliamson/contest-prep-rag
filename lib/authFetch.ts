import { getAuth } from "./firebase";

/**
 * fetch for API routes that require a Firebase ID token. Attaches
 * `Authorization: Bearer <token>` for the signed-in user; rejects when no
 * user is signed in rather than firing an unauthenticated request.
 */
export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const user = getAuth().currentUser;
  if (!user) throw new Error("Not signed in");

  const token = await user.getIdToken();
  return fetch(input, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
  });
}
