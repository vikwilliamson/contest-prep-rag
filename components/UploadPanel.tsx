"use client";

import { useRef, useState } from "react";

type UploadedFile = {
  name: string;
  status: "success" | "error";
  chunks?: number;
};

type UploadState = "idle" | "uploading";

type Toast = {
  id: number;
  message: string;
  type: "success" | "error";
};

function fileExt(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function FileIcon({ name }: { name: string }) {
  const ext = fileExt(name);
  if (ext === "pdf") {
    return (
      <span
        data-testid="file-icon-pdf"
        className="text-xs font-bold text-red-500 uppercase tracking-tight shrink-0"
        aria-label="PDF"
      >
        PDF
      </span>
    );
  }
  if (ext === "docx") {
    return (
      <span
        data-testid="file-icon-docx"
        className="text-xs font-bold text-blue-500 uppercase tracking-tight shrink-0"
        aria-label="DOCX"
      >
        DOCX
      </span>
    );
  }
  return null;
}

let toastIdCounter = 0;

export default function UploadPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [toasts, setToasts] = useState<Toast[]>([]);

  function addToast(message: string, type: Toast["type"]) {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }

  async function handleRemove(filename: string, status: UploadedFile["status"]) {
    if (status === "success") {
      const res = await fetch(`/api/upload?filename=${encodeURIComponent(filename)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Remove failed");
        return;
      }
    }
    setUploadedFiles((prev) => prev.filter((f) => f.name !== filename));
  }

  async function handleUpload(file: File) {
    setError(null);
    setUploadState("uploading");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Upload failed");
        setUploadedFiles((prev) => [...prev, { name: file.name, status: "error" }]);
        addToast(data.error ?? "Upload failed", "error");
        return;
      }

      setUploadedFiles((prev) => [
        ...prev,
        { name: file.name, status: "success", chunks: data.chunks },
      ]);
      addToast(`${file.name} uploaded successfully`, "success");
    } catch {
      setError("Upload failed");
      setUploadedFiles((prev) => [...prev, { name: file.name, status: "error" }]);
      addToast("Upload failed", "error");
    } finally {
      setUploadState("idle");
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }

  const dropZoneLabel =
    uploadState === "uploading"
      ? "Uploading…"
      : "Drop a PDF or DOCX here, or click to select";

  return (
    <div className="flex flex-col gap-4 p-6 border border-zinc-200 rounded-xl dark:border-zinc-700">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Documents</h2>

      <div
        className="flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed border-zinc-300 rounded-lg cursor-pointer hover:border-zinc-400 transition-colors dark:border-zinc-600 dark:hover:border-zinc-500"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        aria-label="Upload file"
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          onChange={handleFileChange}
        />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{dropZoneLabel}</p>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {uploadedFiles.length > 0 && (
        <ul className="flex flex-col gap-1">
          {uploadedFiles.map((f, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <span className={f.status === "success" ? "text-green-600" : "text-red-500"}>
                {f.status === "success" ? "✓" : "✗"}
              </span>
              <FileIcon name={f.name} />
              <span className="flex-1 text-zinc-700 dark:text-zinc-300">
                {f.name}
                {f.chunks != null && (
                  <span className="ml-1 text-zinc-400">({f.chunks} chunks)</span>
                )}
              </span>
              <button
                onClick={() => handleRemove(f.name, f.status)}
                className="text-zinc-400 hover:text-red-500 transition-colors"
                aria-label={`Remove ${f.name}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              data-testid="toast"
              role="status"
              className={`px-4 py-2.5 rounded-lg text-sm text-white shadow-lg transition-all ${
                toast.type === "success" ? "bg-green-600" : "bg-red-500"
              }`}
            >
              {toast.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
