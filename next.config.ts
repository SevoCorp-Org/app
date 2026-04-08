import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent Prisma (and other Node.js-only packages) from being bundled
  // into client-side JavaScript. They must only run on the server.
  serverExternalPackages: ["@prisma/client", "prisma"],

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "utfs.io",
      },
    ],
  },
};

export default nextConfig;
