// ─────────────────────────────────────────────────────────────────────────────
// Shared comment types used across server and client comment components.
// Dates are serialized as ISO strings so they survive the server → client
// boundary without losing type safety.
// ─────────────────────────────────────────────────────────────────────────────

export interface CommentAuthor {
  id: string;
  name: string | null;
  image: string | null;
  role: string;
}

export interface CommentAttachment {
  id: string;
  filename: string;
  url: string;
  mimeType: string;
  size: number;
}

export interface CommentData {
  id: string;
  body: string;
  isEdited: boolean;
  createdAt: string;     // ISO string
  parentId: string | null;
  author: CommentAuthor;
  uploads: CommentAttachment[];
  // Replies are attached by the server before passing to CommentThread
  replies?: CommentData[];
}

// Shape of a comment being added optimistically before the server confirms it
export interface OptimisticComment extends CommentData {
  _optimistic: true;
}
