"use client";

import { useUploadThing } from "@/lib/uploadthing";
import { useCallback, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface UploadedFile {
  id?: string;       // DB id — available after page refresh or optimistic update
  name: string;
  url: string;
  size: number;
  mimeType?: string;
}

interface TaskFileUploadProps {
  taskId: string;
  // Called with each successfully uploaded file so the parent can update UI
  onUploadComplete?: (files: UploadedFile[]) => void;
  // Optional label override
  label?: string;
  // Disable the uploader (e.g. task is COMPLETED)
  disabled?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// TaskFileUpload
//
// Custom upload UI built on useUploadThing so we have full control over
// the drag-and-drop zone, progress display, and error messages.
//
// Does NOT use the generated UploadButton/UploadDropzone components —
// those are useful for quick integration but harder to style consistently.
// ─────────────────────────────────────────────────────────────────────────────

export function TaskFileUpload({
  taskId,
  onUploadComplete,
  label = "Upload deliverables",
  disabled = false,
}: TaskFileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const { startUpload, isUploading } = useUploadThing("taskAttachment", {
    onUploadProgress: (p) => setProgress(p),

    onClientUploadComplete: (res) => {
      setUploading(false);
      setFiles([]);
      setProgress(0);
      setError(null);

      if (onUploadComplete && res) {
        onUploadComplete(
          res.map((r) => ({
            name: r.name,
            url: r.ufsUrl ?? r.url ?? "",
            size: r.size,
          }))
        );
      }
    },

    onUploadError: (err) => {
      setUploading(false);
      setProgress(0);
      setError(err.message ?? "Upload failed. Please try again.");
    },
  });

  // ── File selection ─────────────────────────────────────────────────────────

  const addFiles = useCallback((incoming: FileList | null) => {
    if (!incoming) return;

    const MAX_FILES = 10;
    const MAX_SIZE_MB = 32;

    const valid: File[] = [];
    const errors: string[] = [];

    Array.from(incoming).forEach((file) => {
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        errors.push(`"${file.name}" exceeds ${MAX_SIZE_MB} MB.`);
        return;
      }
      valid.push(file);
    });

    if (errors.length) {
      setError(errors.join(" "));
      return;
    }

    setError(null);
    setFiles((prev) => {
      const combined = [...prev, ...valid];
      return combined.slice(0, MAX_FILES);
    });
  }, []);

  const removeFile = (index: number) =>
    setFiles((prev) => prev.filter((_, i) => i !== index));

  // ── Upload trigger ─────────────────────────────────────────────────────────

  const handleUpload = async () => {
    if (!files.length || uploading) return;
    setUploading(true);
    setError(null);
    // Pass taskId as the `input` for the middleware
    await startUpload(files, { taskId });
  };

  // ── Drag and drop ──────────────────────────────────────────────────────────

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const isDisabled = disabled || isUploading || uploading;

  return (
    <div className="w-full">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={[
          "relative rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors",
          isDisabled
            ? "cursor-not-allowed border-neutral-200 bg-neutral-50"
            : isDragging
            ? "border-neutral-500 bg-neutral-50"
            : "cursor-pointer border-neutral-300 hover:border-neutral-400",
        ].join(" ")}
      >
        <input
          type="file"
          multiple
          disabled={isDisabled}
          onChange={(e) => addFiles(e.target.files)}
          className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
        />

        <p className="text-sm font-medium text-neutral-700">
          {label}
        </p>
        <p className="mt-1 text-xs text-neutral-400">
          Drag & drop or click to browse · Max 32 MB per file · 10 files max
        </p>
        <p className="mt-1 text-xs text-neutral-400">
          Accepted: images, PDFs, Word, Excel, ZIP, and more
        </p>
      </div>

      {/* Staged files */}
      {files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {files.map((file, i) => (
            <li
              key={`${file.name}-${i}`}
              className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-2"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <FileIcon mimeType={file.type} />
                <div className="overflow-hidden">
                  <p className="truncate text-sm font-medium text-neutral-800">
                    {file.name}
                  </p>
                  <p className="text-xs text-neutral-400">
                    {formatBytes(file.size)}
                  </p>
                </div>
              </div>
              {!isDisabled && (
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="ml-3 shrink-0 text-xs text-neutral-400 hover:text-red-500"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Progress bar */}
      {isUploading && (
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-xs text-neutral-500">
            <span>Uploading…</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
            <div
              className="h-full rounded-full bg-neutral-900 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      )}

      {/* Upload button */}
      {files.length > 0 && !isUploading && (
        <button
          type="button"
          onClick={handleUpload}
          disabled={isDisabled}
          className="mt-3 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Upload {files.length} file{files.length !== 1 ? "s" : ""}
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ mimeType }: { mimeType: string }) {
  const isImage = mimeType.startsWith("image/");
  const isPdf = mimeType === "application/pdf";

  if (isImage) {
    return (
      <svg className="h-8 w-8 shrink-0 text-blue-400" viewBox="0 0 16 16" fill="currentColor">
        <path d="M6.502 7a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" />
        <path d="M14 14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5V14zM4 1a1 1 0 0 0-1 1v10l2.224-2.224a.5.5 0 0 1 .61-.075L8 11l2.157-3.02a.5.5 0 0 1 .76-.063L13 10V4.5h-2A1.5 1.5 0 0 1 9.5 3V1H4z" />
      </svg>
    );
  }

  if (isPdf) {
    return (
      <svg className="h-8 w-8 shrink-0 text-red-400" viewBox="0 0 16 16" fill="currentColor">
        <path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2z" />
        <path d="M4.603 14.087a.81.81 0 0 1-.438-.42c-.195-.388-.13-.776.08-1.102.198-.307.526-.568.897-.787a7.68 7.68 0 0 1 1.482-.645 19.697 19.697 0 0 0 1.062-2.227 7.269 7.269 0 0 1-.43-1.295c-.086-.4-.119-.796-.046-1.136.075-.354.274-.672.65-.823.192-.077.4-.12.602-.077a.7.7 0 0 1 .477.365c.088.164.12.356.127.538.007.188-.012.396-.047.614-.084.51-.27 1.134-.52 1.794a10.954 10.954 0 0 0 .98 1.686 5.753 5.753 0 0 1 1.334.05c.364.066.734.195.96.465.12.144.193.32.2.518.007.192-.047.382-.138.563a1.04 1.04 0 0 1-.354.416.856.856 0 0 1-.51.138c-.331-.014-.654-.196-.933-.417a5.712 5.712 0 0 1-.911-.95 11.651 11.651 0 0 0-1.997.406 11.307 11.307 0 0 1-1.02 1.51c-.292.35-.609.656-.927.787a.793.793 0 0 1-.58.029z" />
      </svg>
    );
  }

  return (
    <svg className="h-8 w-8 shrink-0 text-neutral-400" viewBox="0 0 16 16" fill="currentColor">
      <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z" />
    </svg>
  );
}
