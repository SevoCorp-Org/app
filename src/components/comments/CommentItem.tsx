"use client";

import { deleteComment, editComment } from "@/actions/comment.actions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CommentForm } from "./CommentForm";
import type { CommentData } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Role badge colours
// ─────────────────────────────────────────────────────────────────────────────

const ROLE_STYLES: Record<string, string> = {
  ADMIN:        "bg-red-50 text-red-600",
  COMPANY:      "bg-blue-50 text-blue-600",
  PROFESSIONAL: "bg-green-50 text-green-700",
};

// ─────────────────────────────────────────────────────────────────────────────
// CommentItem
//
// Renders a single comment with:
//   - Author avatar (initials fallback), name, role badge, timestamp
//   - Body (markdown-safe: whitespace preserved, no XSS risk)
//   - File attachments
//   - Inline edit form (textarea replaces body)
//   - Inline reply form (shown below the comment)
//   - Edit / Delete / Reply action buttons (conditional on role/authorship)
//
// Replies are rendered recursively, indented one level.
// Replies cannot themselves be replied to (one level enforced in addComment).
// ─────────────────────────────────────────────────────────────────────────────

interface CommentItemProps {
  comment: CommentData;
  taskId: string;
  currentUserId: string;
  currentUserRole: string;
  // Called when a reply is optimistically added so CommentThread can append it
  onReplyAdded: (reply: Omit<CommentData, "replies">) => void;
  // Called after delete so CommentThread can remove it from optimistic state
  onDeleted: (commentId: string) => void;
  // Called after edit so CommentThread can update body in optimistic state
  onEdited: (commentId: string, newBody: string) => void;
  isReply?: boolean;
}

export function CommentItem({
  comment,
  taskId,
  currentUserId,
  currentUserRole,
  onReplyAdded,
  onDeleted,
  onEdited,
  isReply = false,
}: CommentItemProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState(comment.body);
  const [isReplying, setIsReplying] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isOwnComment = comment.author.id === currentUserId;
  const isAdmin = currentUserRole === "ADMIN";
  const canEdit = isOwnComment;
  const canDelete = isOwnComment || isAdmin;
  const canReply = !isReply; // no nesting beyond one level

  // ── Edit ──────────────────────────────────────────────────────────────────

  const handleSaveEdit = async () => {
    const trimmed = editBody.trim();
    if (!trimmed || trimmed === comment.body) {
      setIsEditing(false);
      return;
    }

    setSaving(true);
    setEditError(null);

    const result = await editComment({ commentId: comment.id, body: trimmed });

    setSaving(false);

    if (!result.ok) {
      setEditError(result.error);
      return;
    }

    onEdited(comment.id, trimmed);
    setIsEditing(false);
    router.refresh();
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!window.confirm("Delete this comment? This cannot be undone.")) return;

    setDeleting(true);
    setDeleteError(null);

    const result = await deleteComment({ commentId: comment.id });

    setDeleting(false);

    if (!result.ok) {
      setDeleteError(result.error);
      return;
    }

    onDeleted(comment.id);
    router.refresh();
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const initials = comment.author.name
    ? comment.author.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  const formattedDate = new Date(comment.createdAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={isReply ? "ml-10 mt-2" : ""}>
      <div
        className={[
          "rounded-lg border p-4",
          comment._optimistic
            ? "border-neutral-100 bg-neutral-50 opacity-70"
            : "border-neutral-200 bg-white",
        ].join(" ")}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {/* Avatar */}
            {comment.author.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={comment.author.image}
                alt={comment.author.name ?? ""}
                className="h-7 w-7 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-200 text-xs font-semibold text-neutral-600">
                {initials}
              </div>
            )}

            {/* Name + role */}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-neutral-900">
                  {comment.author.name ?? "Unknown"}
                  {isOwnComment && (
                    <span className="ml-1 text-xs text-neutral-400">(you)</span>
                  )}
                </span>
                {comment.author.role && (
                  <span
                    className={[
                      "rounded px-1.5 py-0.5 text-xs font-medium",
                      ROLE_STYLES[comment.author.role] ?? "bg-neutral-100 text-neutral-600",
                    ].join(" ")}
                  >
                    {comment.author.role}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                <span>{formattedDate}</span>
                {comment.isEdited && <span>· edited</span>}
                {comment._optimistic && <span>· sending…</span>}
              </div>
            </div>
          </div>

          {/* Actions — only shown when not editing */}
          {!isEditing && !comment._optimistic && (
            <div className="flex items-center gap-1">
              {canReply && (
                <ActionButton
                  onClick={() => setIsReplying((v) => !v)}
                  label="Reply"
                  icon={
                    <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                      <path d="M6.598 5.013a.144.144 0 0 1 .202.134V6.3a.5.5 0 0 0 .5.5c.667 0 2.013.005 3.3.822.984.624 1.99 1.76 2.595 3.876-1.02-.983-2.185-1.516-3.205-1.799a8.74 8.74 0 0 0-1.921-.306 7.404 7.404 0 0 0-.798.008h-.013l-.005.001h-.001L7.3 9.9l-.05-.498a.5.5 0 0 0-.45.498v1.153c0 .108-.11.176-.202.134L2.614 8.254a.503.503 0 0 0-.042-.028.147.147 0 0 1 0-.252.499.499 0 0 0 .042-.028l3.984-2.933z" />
                    </svg>
                  }
                />
              )}
              {canEdit && (
                <ActionButton
                  onClick={() => {
                    setEditBody(comment.body);
                    setIsEditing(true);
                  }}
                  label="Edit"
                  icon={
                    <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                      <path d="M12.854.146a.5.5 0 0 0-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 0 0 0-.708l-3-3zm.646 6.061L9.793 2.5 3.293 9H3.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.207l6.5-6.5zm-7.468 7.468A.5.5 0 0 1 6 13.5V13h-.5a.5.5 0 0 1-.5-.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.5-.5V10h-.5a.499.499 0 0 1-.175-.032l-.179.178a.5.5 0 0 0-.11.168l-2 5a.5.5 0 0 0 .65.65l5-2a.5.5 0 0 0 .168-.11l.178-.178z" />
                    </svg>
                  }
                />
              )}
              {canDelete && (
                <ActionButton
                  onClick={handleDelete}
                  label="Delete"
                  loading={deleting}
                  destructive
                  icon={
                    <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                      <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" />
                      <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z" />
                    </svg>
                  }
                />
              )}
            </div>
          )}
        </div>

        {/* ── Body — inline edit or display ────────────────────────────────── */}
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              rows={3}
              disabled={saving}
              autoFocus
              className="w-full resize-none rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-500 disabled:bg-neutral-50"
            />
            {editError && (
              <p className="text-xs text-red-600">{editError}</p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={saving || !editBody.trim()}
                className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={saving}
                className="rounded-md px-3 py-1.5 text-xs text-neutral-500 hover:text-neutral-800"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-sm text-neutral-700">
            {comment.body}
          </p>
        )}

        {/* ── Attachments ─────────────────────────────────────────────────── */}
        {comment.uploads.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {comment.uploads.map((f) => (
              <a
                key={f.id}
                href={f.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded border border-neutral-200 px-2.5 py-1 text-xs text-neutral-600 hover:bg-neutral-50"
              >
                <svg className="h-3.5 w-3.5 text-neutral-400" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M4.5 3a2.5 2.5 0 0 1 5 0v9a1.5 1.5 0 0 1-3 0V5a.5.5 0 0 1 1 0v7a.5.5 0 0 0 1 0V3a1.5 1.5 0 1 0-3 0v9a2.5 2.5 0 0 0 5 0V5a.5.5 0 0 1 1 0v7a3.5 3.5 0 1 1-7 0V3z" />
                </svg>
                {f.filename}
              </a>
            ))}
          </div>
        )}

        {/* Delete error */}
        {deleteError && (
          <p className="mt-2 text-xs text-red-600">{deleteError}</p>
        )}
      </div>

      {/* ── Replies ─────────────────────────────────────────────────────────── */}
      {comment.replies?.map((reply) => (
        <CommentItem
          key={reply.id}
          comment={reply}
          taskId={taskId}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          onReplyAdded={onReplyAdded}
          onDeleted={onDeleted}
          onEdited={onEdited}
          isReply
        />
      ))}

      {/* ── Inline reply form ───────────────────────────────────────────────── */}
      {isReplying && (
        <div className="ml-10 mt-2">
          <CommentForm
            taskId={taskId}
            parentId={comment.id}
            placeholder={`Reply to ${comment.author.name ?? "comment"}…`}
            onSuccess={(reply) => {
              onReplyAdded(reply);
              setIsReplying(false);
              router.refresh();
            }}
            onCancel={() => setIsReplying(false)}
          />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ActionButton — small icon button used in the comment header
// ─────────────────────────────────────────────────────────────────────────────

interface ActionButtonProps {
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
  loading?: boolean;
  destructive?: boolean;
}

function ActionButton({ onClick, label, icon, loading, destructive }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      title={label}
      className={[
        "flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors disabled:opacity-50",
        destructive
          ? "text-neutral-400 hover:bg-red-50 hover:text-red-500"
          : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700",
      ].join(" ")}
    >
      {loading ? <span className="text-neutral-300">…</span> : icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
