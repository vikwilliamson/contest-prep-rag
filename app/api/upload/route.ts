import { unlink, writeFile } from "fs/promises";
import { basename, join } from "path";
import type { NextRequest } from "next/server";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export async function POST(request: NextRequest) {
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

  const bytes = await file.arrayBuffer();
  const filePath = join(process.cwd(), "uploads", file.name);
  await writeFile(filePath, Buffer.from(bytes));

  return Response.json({ filename: file.name });
}

export async function DELETE(request: NextRequest) {
  const filename = request.nextUrl.searchParams.get("filename");

  if (!filename || basename(filename) !== filename) {
    return Response.json({ error: "Invalid filename" }, { status: 400 });
  }

  const filePath = join(process.cwd(), "uploads", filename);

  try {
    await unlink(filePath);
  } catch {
    return Response.json({ error: "File not found" }, { status: 404 });
  }

  return Response.json({ filename });
}
