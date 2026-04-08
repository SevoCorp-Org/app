"use client";

import { deleteFile } from "@/actions/upload.actions";
import { useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// UploadedFileList
//
// Renders a list of already-uploaded files with download links and optional
// delete buttons. Used inside task detail pages for both task-level and
// comment-level attachments.
// ─────────────────────────────────────────────────────────────────────────────

interface FileItem {
  id: string;
  filename: string;
  url: string;
  size: number;
  mimeType: string;
  createdAt: Date | string;
  uploadedBy?: { name: string | null; role: string };
}

interface UploadedFileListProps {
  files: FileItem[];
  canDelete?: boolean;
  // Called after a successful deletion so parent can re-fetch or remove item
  onDeleted?: (fileId: string) => void;
  emptyMessage?: string;
}

export function UploadedFileList({
  files,
  canDelete = false,
  onDeleted,
  emptyMessage = "No files attached.",
}: UploadedFileListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleDelete = async (fileId: string) => {
    setDeletingId(fileId);
    setErrors((e) => ({ ...e, [fileId]: "" }));

    const result = await deleteFile({ fileId });

    setDeletingId(null);

    if (!result.ok) {
      setErrors((e) => ({ ...e, [fileId]: result.error }));
      return;
    }

    onDeleted?.(fileId);
  };

  if (!files.length) {
    return <p className="text-sm text-neutral-400">{emptyMessage}</p>;
  }

  return (
    <ul className="space-y-2">
      {files.map((file) => (
        <li
          key={file.id}
          className="flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-3"
        >
          {/* File info + download */}
          <a
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex min-w-0 items-center gap-3"
          >
            <FileTypeIcon mimeType={file.mimeType} />
            <div className="overflow-hidden">
              <p className="truncate text-sm font-medium text-neutral-900 group-hover:underline">
                {file.filename}
              </p>
              <p className="text-xs text-neutral-400">
                {formatBytes(file.size)}
                {file.uploadedBy && (
                  <>
                    {" · "}
                    {file.uploadedBy.name ?? "Unknown"}{" "}
                    <span className="text-neutral-300">
                      ({file.uploadedBy.role})
                    </span>
                  </>
                )}
                {" · "}
                {new Date(file.createdAt).toLocaleDateString()}
              </p>
            </div>
          </a>

          {/* Actions */}
          <div className="ml-4 flex shrink-0 items-center gap-3">
            {/* Download button */}
            <a
              href={file.url}
              download={file.filename}
              className="text-xs text-neutral-500 hover:text-neutral-800"
              title="Download"
            >
              <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
                <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z" />
                <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z" />
              </svg>
            </a>

            {/* Delete button — only rendered if caller grants permission */}
            {canDelete && (
              <button
                type="button"
                onClick={() => handleDelete(file.id)}
                disabled={deletingId === file.id}
                className="text-xs text-neutral-400 hover:text-red-500 disabled:opacity-50"
                title="Delete file"
              >
                {deletingId === file.id ? (
                  <span className="text-neutral-400">Deleting…</span>
                ) : (
                  <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" />
                    <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z" />
                  </svg>
                )}
              </button>
            )}
          </div>

          {/* Inline error */}
          {errors[file.id] && (
            <p className="mt-1 text-xs text-red-600">{errors[file.id]}</p>
          )}
        </li>
      ))}
    </ul>
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

function FileTypeIcon({ mimeType }: { mimeType: string }) {
  const color = mimeType.startsWith("image/")
    ? "text-blue-400"
    : mimeType === "application/pdf"
    ? "text-red-400"
    : mimeType.includes("spreadsheet") || mimeType.includes("excel")
    ? "text-green-500"
    : "text-neutral-400";

  return (
    <svg
      className={`h-8 w-8 shrink-0 ${color}`}
      viewBox="0 0 16 16"
      fill="currentColor"
    >
      <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z" />
    </svg>
  );
}
