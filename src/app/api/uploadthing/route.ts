import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";

// ─────────────────────────────────────────────────────────────────────────────
// UploadThing Next.js App Router handler.
// Handles GET (presigned URL fetch) and POST (upload completion callback).
// ─────────────────────────────────────────────────────────────────────────────

export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
  config: {
    // Override the URL UploadThing uses to call back into this app.
    // Required when running behind a proxy or in a non-standard environment.
    callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/uploadthing`,
  },
});
