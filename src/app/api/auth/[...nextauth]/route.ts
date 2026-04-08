import { authOptions } from "@/lib/auth";
import NextAuth from "next-auth";

// Single handler exported for both GET and POST.
// Next.js App Router requires named exports.
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
