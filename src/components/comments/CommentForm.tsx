"use client";

import { addComment } from "@/actions/comment.actions";
import { linkCommentAttachments } from "@/actions/upload.actions";
import { useUploadThing } from "@/lib/uploadthing";
import { useRef, useState } from "react";
import type { CommentData } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// CommentForm
//
// Used for both top-level comments and replies.
// When `parentId` is provided it renders in compact reply mode.
//
// Upload flow:
//   1. User selects files (optional)
//   2. On submit: files upload first via useUploadThing (server stores FileUpload rows)
//   3. addComment server action creates the Comment row
//   4. linkCommentAttachments associates the uploaded FileUpload rows to the comment
//   5. onSuccess called — parent optimistically appends + triggers router.refresh()
// ─────────────────────────────────────────────────────────────────────────────

interface CommentFormProps {
  taskId: string;
  parentId?: string;          // set for replies
  placeholder?: string;
  onSuccess: (comment: Omit<CommentData, "replies">) => void;
  onCancel?: () => void;       // only needed in reply/edit mode
}

export function CommentForm({
  taskId,
  parentId,
  placeholder = "Add a comment…",
  onSuccess,
  onCancel,
}: CommentFormProps) {
  const [body, setBody] = useState("");
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { startUpload, isUploading } = useUploadThing("commentAttachment", {
    onUploadError: (err) => {
      setError(`File upload failed: ${err.message}`);
      setSubmitting(false);
    },
  });

  const isLoading = submitting || isUploading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = body.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setError(null);

    // ── Step 1: Upload files (if any) ─────────────────────────────────────────
    let uploadedFileIds: string[] = [];

    if (stagedFiles.length > 0) {
      const uploadRes = await startUpload(stagedFiles, { taskId });

      if (!uploadRes || uploadRes.length === 0) {
        // Error already set by onUploadError
        setSubmitting(false);
        return;
      }

      // The server returns the DB file IDs via the serverData field
      // (set in onUploadComplete return value — we use filename matching as fallback)
      uploadedFileIds = uploadRes
        .map((r) => (r.serverData as { fileId?: string } | null)?.fileId)
        .filter((id): id is string => Boolean(id));
    }

    // ── Step 2: Create the comment ────────────────────────────────────────────
    const result = await addComment({
      taskId,
      body: trimmed,
      parentId,
    });

    if (!result.ok) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    const commentId = result.data.commentId;

    // ── Step 3: Link uploaded files to the comment ────────────────────────────
    if (uploadedFileIds.length > 0) {
      await linkCommentAttachments({ commentId, fileIds: uploadedFileIds });
    }

    // ── Step 4: Notify parent ─────────────────────────────────────────────────
    // We construct a minimal optimistic comment shape.
    // router.refresh() in the parent will replace this with real server data.
    onSuccess({
      id: commentId,
      body: trimmed,
      isEdited: false,
      createdAt: new Date().toISOString(),
      parentId: parentId ?? null,
      author: { id: "", name: "You", image: null, role: "" },
      uploads: [],
    });

    setBody("");
    setStagedFiles([]);
    setSubmitting(false);
  };

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setStagedFiles((prev) => {
      const combined = [...prev, ...Array.from(list)];
      return combined.slice(0, 4); // max 4 per comment
    });
  };

  const isReply = Boolean(parentId);

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        rows={isReply ? 2 : 3}
        disabled={isLoading}
        className="w-full resize-none rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 outline-none transition-colors focus:border-neutral-400 disabled:bg-neutral-50"
      />

      {/* Staged files */}
      {stagedFiles.length > 0 && (
        <ul className="space-y-1">
          {stagedFiles.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center justify-between rounded border border-neutral-200 px-3 py-1.5 text-xs"
            >
              <span className="truncate text-neutral-700">{f.name}</span>
              <button
                type="button"
                onClick={() =>
                  setStagedFiles((prev) => prev.filter((_, idx) => idx !== i))
                }
                className="ml-2 text-neutral-400 hover:text-red-500"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Upload progress */}
      {isUploading && (
        <p className="text-xs text-neutral-500">Uploading files…</p>
      )}

      {/* Error */}
      {error && <p className="text-xs text-red-600">{error}</p>}

      {/* Actions row */}
      <div className="flex items-center gap-2">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />

        {/* Attach file button */}
        {!isReply && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || stagedFiles.length >= 4}
            className="flex items-center gap-1.5 rounded-md border border-neutral-200 px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
            title="Attach files (max 4)"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4.5 3a2.5 2.5 0 0 1 5 0v9a1.5 1.5 0 0 1-3 0V5a.5.5 0 0 1 1 0v7a.5.5 0 0 0 1 0V3a1.5 1.5 0 1 0-3 0v9a2.5 2.5 0 0 0 5 0V5a.5.5 0 0 1 1 0v7a3.5 3.5 0 1 1-7 0V3z" />
            </svg>
            Attach
          </button>
        )}

        <div className="flex-1" />

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-md px-3 py-1.5 text-xs text-neutral-500 hover:text-neutral-800 disabled:opacity-50"
          >
            Cancel
          </button>
        )}

        <button
          type="submit"
          disabled={isLoading || !body.trim()}
          className="rounded-md bg-neutral-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (isUploading ? "Uploading…" : "Posting…") : isReply ? "Reply" : "Comment"}
        </button>
      </div>
    </form>
  );
}
