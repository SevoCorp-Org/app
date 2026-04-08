"use client";

import { TaskFileUpload, type UploadedFile } from "@/components/upload/TaskFileUpload";
import { UploadedFileList } from "@/components/upload/UploadedFileList";
import { useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// TaskUploadSection
//
// Composites the upload dropzone + file list into one client island.
// Embedded in the server-rendered task detail page.
//
// Optimistically appends newly uploaded files to the list so the user
// sees them immediately without a full page refresh.
// ─────────────────────────────────────────────────────────────────────────────

interface ExistingFile {
  id: string;
  filename: string;
  url: string;
  size: number;
  mimeType: string;
  createdAt: Date | string;
  uploadedBy?: { name: string | null; role: string };
}

interface TaskUploadSectionProps {
  taskId: string;
  initialFiles: ExistingFile[];
  canUpload: boolean;    // false when task is COMPLETED or professional is not assigned
  canDelete: boolean;    // true for uploader and admin
}

export function TaskUploadSection({
  taskId,
  initialFiles,
  canUpload,
  canDelete,
}: TaskUploadSectionProps) {
  const [files, setFiles] = useState<ExistingFile[]>(initialFiles);

  const handleUploadComplete = (uploaded: UploadedFile[]) => {
    // Optimistically add the files — they are in DB at this point (onUploadComplete ran)
    const optimistic: ExistingFile[] = uploaded.map((f) => ({
      id: crypto.randomUUID(), // temp id until page refresh gives real DB id
      filename: f.name,
      url: f.url,
      size: f.size,
      mimeType: f.mimeType ?? "application/octet-stream",
      createdAt: new Date().toISOString(),
    }));
    setFiles((prev) => [...optimistic, ...prev]);
  };

  const handleDeleted = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  return (
    <div className="space-y-4">
      {/* Existing files */}
      <UploadedFileList
        files={files}
        canDelete={canDelete}
        onDeleted={handleDeleted}
        emptyMessage="No files attached yet."
      />

      {/* Upload zone — only shown when the professional can act */}
      {canUpload && (
        <TaskFileUpload
          taskId={taskId}
          label="Upload deliverables"
          onUploadComplete={handleUploadComplete}
        />
      )}
    </div>
  );
}
