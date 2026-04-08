import type { OurFileRouter } from "@/app/api/uploadthing/core";
import {
  generateUploadButton,
  generateUploadDropzone,
  generateReactHelpers,
} from "@uploadthing/react";

// ─────────────────────────────────────────────────────────────────────────────
// Typed, pre-bound UploadThing helpers.
// Import from here — not from @uploadthing/react directly — so the FileRouter
// type flows everywhere automatically.
//
// UploadButton   → styled button component (add className for overrides)
// UploadDropzone → drag-and-drop zone component
// useUploadThing → hook for fully custom upload UI
// ─────────────────────────────────────────────────────────────────────────────

export const UploadButton   = generateUploadButton<OurFileRouter>();
export const UploadDropzone = generateUploadDropzone<OurFileRouter>();

export const { useUploadThing, uploadFiles } =
  generateReactHelpers<OurFileRouter>();
