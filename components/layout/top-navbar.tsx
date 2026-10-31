"use client";

import { useState } from "react";
import { Search, Menu, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, Settings, LogOut } from "lucide-react";
import Link from "next/link";
import { NotificationDropdown } from "@/components/shared/notification-dropdown";
import { MarketSessionIndicator } from "@/components/shared/market-session-indicator";
import { authClient } from "@/lib/auth-client";
import { Logo } from "./logo";

function getInitials(value: string): string {
  const t = value.trim();
  if (!t) return "?";
  if (t.includes("@")) return t.slice(0, 2).toUpperCase();
  const parts = t.split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function TopNavbar({ onOpenMobile }: { onOpenMobile: () => void }) {
  const { data: session } = authClient.useSession();
  const user = session?.user;
  const displayName = user?.name?.trim() || user?.email || "Your account";
  const email = user?.email ?? "";
  const initials = getInitials(user?.name?.trim() || user?.email || "");
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await authClient.signOut();
    } catch {
      /* fall through to reload — session is cleared client-side anyway */
    }
    // Hard reload so the shell re-checks the session and shows the login screen.
    window.location.reload();
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onOpenMobile}
        aria-label="Open navigation menu"
      >
        <Menu className="size-5" />
      </Button>

      <div className="md:hidden">
        <Logo collapsed />
      </div>

      {/* Search — desktop */}
      <div className="relative hidden max-w-xs flex-1 md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search pairs, signals…"
          className="h-9 w-full rounded-md border border-input bg-surface pl-9 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      </div>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <MarketSessionIndicator compact className="hidden lg:flex" />
        <NotificationDropdown />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-full p-0.5 pr-1 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Account menu"
            >
              <Avatar>
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="normal-case">
              <div className="flex flex-col">
                <span className="truncate text-sm font-semibold text-foreground">
                  {displayName}
                </span>
                <span className="truncate text-xs font-normal text-muted-foreground">
                  {email || "Signed in"}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <User />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                handleSignOut();
              }}
              disabled={signingOut}
              className="text-negative focus:text-negative"
            >
              {signingOut ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <LogOut />
              )}
              {signingOut ? "Signing out…" : "Sign out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
