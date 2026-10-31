"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { KeyRound, LogOut, ShieldCheck, Loader2, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";
import { cn } from "@/lib/utils";

const ADMIN_NAV = [
  { label: "License Keys", href: "/admin/keys", icon: KeyRound },
  { label: "Users", href: "/admin/users", icon: UserCheck },
];

/** Shell for authenticated admin pages: branded top bar, nav, logout. */
export function AdminFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center gap-3 px-4 sm:gap-4 md:px-6">
          <Link href="/admin/keys" className="flex shrink-0 items-center">
            <Logo collapsed className="sm:hidden" />
            <Logo className="hidden sm:flex" />
          </Link>
          <span className="flex shrink-0 items-center gap-1 rounded-md border border-primary/30 bg-primary-muted px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
            <ShieldCheck className="size-3" />
            Admin
          </span>

          <nav className="ml-2 hidden items-center gap-1 sm:flex">
            {ADMIN_NAV.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary-muted text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            disabled={loggingOut}
            className="ml-auto shrink-0"
          >
            {loggingOut ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <LogOut className="size-4" />
            )}
            Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 md:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
