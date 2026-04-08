"use client";

import { useTaskPolling } from "@/hooks/useTaskPolling";
import { useOptimistic, useTransition } from "react";
import { CommentForm } from "./CommentForm";
import { CommentItem } from "./CommentItem";
import type { CommentData, OptimisticComment } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// CommentThread
//
// The top-level client component for all task communication.
//
// Data flow:
//   Server page fetches comments and nests replies → passes as `initialComments`
//   useOptimistic wraps the list so new comments appear instantly
//   After any mutation, router.refresh() (inside child components) re-fetches
//   the server page; when new props arrive, useOptimistic syncs to them
//
// Real-time:
//   useTaskPolling calls router.refresh() on an interval so other users'
//   comments appear without manual page refresh. Tab-visibility-aware.
// ─────────────────────────────────────────────────────────────────────────────

interface CommentThreadProps {
  taskId: string;
  initialComments: CommentData[];    // top-level comments with replies pre-nested
  currentUserId: string;
  currentUserRole: string;
  canComment: boolean;               // false when task is COMPLETED
  enableRealtime?: boolean;          // defaults to true
  pollingIntervalMs?: number;        // defaults to 15s
}

export function CommentThread({
  taskId,
  initialComments,
  currentUserId,
  currentUserRole,
  canComment,
  enableRealtime = true,
  pollingIntervalMs = 15_000,
}: CommentThreadProps) {
  // ── Real-time polling ─────────────────────────────────────────────────────
  useTaskPolling({ enabled: enableRealtime, intervalMs: pollingIntervalMs });

  // ── Optimistic state ──────────────────────────────────────────────────────
  // useOptimistic keeps the displayed list in sync with server props while
  // allowing instant local mutations before the server confirms.
  //
  // The reducer handles three action types:
  //   ADD     → prepend a new optimistic comment
  //   DELETE  → remove by id
  //   EDIT    → update body + isEdited flag by id

  type OptimisticAction =
    | { type: "ADD";    comment: OptimisticComment }
    | { type: "DELETE"; id: string }
    | { type: "EDIT";   id: string; body: string };

  const [optimisticComments, dispatchOptimistic] = useOptimistic<
    CommentData[],
    OptimisticAction
  >(
    initialComments,
    (current, action) => {
      switch (action.type) {
        case "ADD":
          return [action.comment, ...current];

        case "DELETE":
          return removeById(current, action.id);

        case "EDIT":
          return editById(current, action.id, action.body);
      }
    }
  );

  const [, startTransition] = useTransition();

  // ── Handlers passed to child components ──────────────────────────────────

  const handleCommentAdded = (comment: Omit<CommentData, "replies">) => {
    startTransition(() => {
      if (comment.parentId) {
        // This is a reply — attach it under the parent comment optimistically
        dispatchOptimistic({
          type: "ADD",
          comment: { ...(comment as OptimisticComment), _optimistic: true, replies: [] },
        });
      } else {
        dispatchOptimistic({
          type: "ADD",
          comment: { ...(comment as OptimisticComment), _optimistic: true, replies: [] },
        });
      }
    });
  };

  const handleDeleted = (commentId: string) => {
    startTransition(() => {
      dispatchOptimistic({ type: "DELETE", id: commentId });
    });
  };

  const handleEdited = (commentId: string, newBody: string) => {
    startTransition(() => {
      dispatchOptimistic({ type: "EDIT", id: commentId, body: newBody });
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const topLevel = optimisticComments.filter((c) => !c.parentId);

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
          Comments{" "}
          <span className="ml-1 rounded bg-neutral-100 px-1.5 py-0.5 text-neutral-600">
            {topLevel.length}
          </span>
        </h2>
        {enableRealtime && (
          <span className="flex items-center gap-1.5 text-xs text-neutral-400">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400" />
            Live
          </span>
        )}
      </div>

      {/* ── New comment form ─────────────────────────────────────────────────── */}
      {canComment ? (
        <div className="mb-6">
          <CommentForm
            taskId={taskId}
            onSuccess={handleCommentAdded}
          />
        </div>
      ) : (
        <p className="mb-6 rounded-lg border border-neutral-100 bg-neutral-50 px-4 py-3 text-sm text-neutral-400">
          This task is completed — the comment thread is now read-only.
        </p>
      )}

      {/* ── Comment list ────────────────────────────────────────────────────── */}
      {topLevel.length === 0 ? (
        <p className="py-6 text-center text-sm text-neutral-400">
          No comments yet. Be the first to leave one.
        </p>
      ) : (
        <div className="space-y-4">
          {topLevel.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              taskId={taskId}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              onReplyAdded={handleCommentAdded}
              onDeleted={handleDeleted}
              onEdited={handleEdited}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pure reducer helpers — operate on the nested comment tree
// ─────────────────────────────────────────────────────────────────────────────

function removeById(comments: CommentData[], id: string): CommentData[] {
  return comments
    .filter((c) => c.id !== id)
    .map((c) => ({
      ...c,
      replies: c.replies ? removeById(c.replies, id) : [],
    }));
}

function editById(
  comments: CommentData[],
  id: string,
  body: string
): CommentData[] {
  return comments.map((c) => {
    if (c.id === id) return { ...c, body, isEdited: true };
    return {
      ...c,
      replies: c.replies ? editById(c.replies, id, body) : [],
    };
  });
}
