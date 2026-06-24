import type { NextRequest } from "next/server";
import { getRagChain } from "../../../lib/ragChain";
import { chainStreamToResponse } from "../../../lib/streaming";
import { verifyIdToken } from "../../../lib/firebase-admin";

export async function POST(request: NextRequest) {
  let uid: string;
  try {
    uid = await verifyIdToken(request);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).question !== "string"
  ) {
    return Response.json(
      { error: "Missing or invalid 'question' field" },
      { status: 400 }
    );
  }

  const { question, chat_history = "" } = body as {
    question: string;
    chat_history?: string;
  };

  try {
    const chain = await getRagChain(uid);
    const stream = await chain.stream({ question, chat_history });
    return chainStreamToResponse(stream);
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
