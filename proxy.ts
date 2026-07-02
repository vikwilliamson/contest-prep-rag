import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Temporary "ward off evildoers" gate via HTTP Basic Auth. This is a stopgap
// while real auth (Firebase) is disabled — see lib/firebase.ts / lib/auth-context.tsx.
//
// The gate is opt-in: it only activates when BOTH GATE_USER and GATE_PASS are
// set in the environment. If either is missing, the app is open (no challenge).
export function proxy(request: NextRequest) {
  const user = process.env.GATE_USER;
  const pass = process.env.GATE_PASS;

  if (!user || !pass) {
    return NextResponse.next();
  }

  const header = request.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    const sep = decoded.indexOf(":");
    const reqUser = decoded.slice(0, sep);
    const reqPass = decoded.slice(sep + 1);
    if (reqUser === user && reqPass === pass) {
      return NextResponse.next();
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Contest Prep RAG", charset="UTF-8"',
    },
  });
}

export const config = {
  // Gate everything except Next's static assets and the favicon.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
