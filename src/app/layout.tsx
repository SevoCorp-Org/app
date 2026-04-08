import "@/app/globals.css";
import { Toaster } from "@/components/ui/sonner";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    default: "SevoCorp",
    template: "%s — SevoCorp",
  },
  description: "SevoCorp Virtual Department System",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
