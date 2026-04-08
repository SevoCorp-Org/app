"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { LogOut, Menu, Settings, User } from "lucide-react";
import { signOut } from "next-auth/react";
import * as React from "react";
import { useState } from "react";
import { toast } from "sonner";

interface TopbarProps {
  userName:       string;
  userEmail:      string;
  userRole:       string;
  userDashboard?: string;
  mobileSidebar?: React.ReactNode;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Topbar({ userName, userEmail, userRole, userDashboard, mobileSidebar }: TopbarProps) {
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    toast.loading("Signing out…", { id: "signout" });
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur-sm lg:px-6">
      {/* Mobile menu */}
      {mobileSidebar && (
        <Sheet>
          <SheetTrigger asChild>
            <button
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-4 w-4" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-[var(--sidebar-w)]">
            {mobileSidebar}
          </SheetContent>
        </Sheet>
      )}

      <div className="flex-1" />

      {/* Role pill */}
      <span className="hidden rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-500 sm:inline-block">
        {userRole}
      </span>

      {/* User dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center gap-2 rounded-full outline-none ring-offset-1 focus-visible:ring-2 focus-visible:ring-slate-400"
            disabled={signingOut}
          >
            <Avatar className="h-8 w-8 border border-slate-200">
              <AvatarImage src="" alt={userName} />
              <AvatarFallback className="text-xs font-semibold">{initials(userName)}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal py-2">
            <p className="truncate text-sm font-semibold text-slate-900">{userName}</p>
            <p className="truncate text-xs text-slate-500">{userEmail}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <a href={`${userDashboard ?? ""}/profile`} className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              Profile
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={`${userDashboard ?? ""}/settings`} className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-red-600 focus:bg-red-50 focus:text-red-700"
            onSelect={handleSignOut}
            disabled={signingOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            {signingOut ? "Signing out…" : "Sign out"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
