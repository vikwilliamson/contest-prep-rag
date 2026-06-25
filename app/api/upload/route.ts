import { unlink, writeFile } from "fs/promises";
import { basename, join } from "path";
import type { NextRequest } from "next/server";
import { processDocument } from "../../../lib/documentProcessor";
import { getVectorStore } from "../../../lib/vectorStore";
import { verifyIdToken } from "../../../lib/firebase-admin";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const UPLOADS_DIR = join(process.cwd(), "uploads");
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export async function POST(request: NextRequest) {
  let uid: string;
  try {
    uid = await verifyIdToken(request);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return Response.json(
      { error: "Invalid file type. Only PDF and DOCX files are accepted." },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return Response.json(
      { error: "File too large. Maximum size is 10MB." },
      { status: 400 }
    );
  }

  const filename = basename(file.name);
  const filePath = join(UPLOADS_DIR, filename);

  try {
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));
  } catch {
    return Response.json({ error: "Failed to save file" }, { status: 500 });
  }

  let chunks = 0;
  try {
    const docChunks = await processDocument(filePath, file.type);
    const store = await getVectorStore(uid);
    await store.addDocuments(docChunks);
    chunks = docChunks.length;
  } catch (err) {
    console.error("Document processing failed:", err);
    return Response.json({ error: "Failed to process document" }, { status: 500 });
  }

  return Response.json({ filename, chunks });
}

export async function DELETE(request: NextRequest) {
  try {
    await verifyIdToken(request);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const filename = request.nextUrl.searchParams.get("filename");

  if (!filename || basename(filename) !== filename) {
    return Response.json({ error: "Invalid filename" }, { status: 400 });
  }

  try {
    await unlink(join(UPLOADS_DIR, filename));
  } catch {
    return Response.json({ error: "File not found" }, { status: 404 });
  }

  return Response.json({ filename });
}
