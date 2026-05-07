"use client";

import { useRef, useState } from "react";

type UploadedFile = {
  name: string;
  status: "success" | "error";
};

export default function UploadPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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
    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Upload failed");
        setUploadedFiles((prev) => [...prev, { name: file.name, status: "error" }]);
        return;
      }

      setUploadedFiles((prev) => [...prev, { name: file.name, status: "success" }]);

      // TODO: pass document through processing pipeline
      alert("pipeline ready to begin!");
    } catch {
      setError("Upload failed");
      setUploadedFiles((prev) => [...prev, { name: file.name, status: "error" }]);
    } finally {
      setIsUploading(false);
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
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {isUploading ? "Uploading…" : "Drop a PDF or DOCX here, or click to select"}
        </p>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {uploadedFiles.length > 0 && (
        <ul className="flex flex-col gap-1">
          {uploadedFiles.map((f, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <span className={f.status === "success" ? "text-green-600" : "text-red-500"}>
                {f.status === "success" ? "✓" : "✗"}
              </span>
              <span className="flex-1 text-zinc-700 dark:text-zinc-300">{f.name}</span>
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
    </div>
  );
}
