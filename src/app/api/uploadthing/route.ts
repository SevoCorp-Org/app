import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";

// ─────────────────────────────────────────────────────────────────────────────
// UploadThing Next.js App Router handler.
// Handles GET (presigned URL fetch) and POST (upload completion callback).
// ─────────────────────────────────────────────────────────────────────────────

export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
});
