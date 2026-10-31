"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { AppSidebar } from "./app-sidebar";
import { TopNavbar } from "./top-navbar";
import { MobileNavigation } from "./mobile-navigation";
import { SignUpScreen } from "@/components/auth/sign-up-screen";
import { AccountStatusScreen } from "@/components/auth/account-status-screen";
import { authClient } from "@/lib/auth-client";

// Code-split the floating AI assistant (pulls in framer-motion) — it is not
// needed for first paint, so load it after the shell is interactive.
const AiAssistant = dynamic(
  () => import("@/components/shared/ai-assistant").then((m) => m.AiAssistant),
  { ssr: false }
);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) {
    return <>{children}</>;
  }
  return <AuthenticatedAppShell>{children}</AuthenticatedAppShell>;
}

function AuthenticatedAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const { data: session, isPending, error } = authClient.useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  async function signOut() {
    setSignOutError(null);
    try {
      const result = await authClient.signOut();
      if (result.error) {
        setSignOutError(result.error.message ?? "Unable to sign out");
        return;
      }
      window.location.reload();
    } catch {
      setSignOutError("Unable to reach the authentication service.");
    }
  }

  // Only the public landing route ("/") is reachable while signed-out or pending
  // approval, so it is the ONLY place that needs the client-side gate. Every
  // other route is already guaranteed authenticated + approved by proxy.ts
  // (server-side), so we render the shell immediately and never re-block on
  // navigation — the session just fills in the name/avatar once it resolves.
  if (isLanding) {
    if (isPending) {
      return (
        <main className="flex min-h-dvh items-center justify-center bg-background">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <LoaderCircle className="size-5 animate-spin text-primary" />
            Checking your account…
          </div>
        </main>
      );
    }

    if (error) {
      return (
        <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-4 text-center">
          <p className="max-w-md text-sm text-negative">
            Unable to check your sign-in status: {error.message}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            Try again
          </button>
        </main>
      );
    }

    if (!session) {
      return <SignUpScreen />;
    }

    if (session.user.approvalStatus !== "APPROVED") {
      return (
        <AccountStatusScreen
          status={session.user.approvalStatus ?? "PENDING"}
          name={session.user.name}
          quotexAccountId={session.user.quotexAccountId}
          onSignOut={signOut}
          error={signOutError}
        />
      );
    }
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden">
      <AppSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
      />
      <MobileNavigation open={mobileOpen} onOpenChange={setMobileOpen} />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopNavbar onOpenMobile={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="mx-auto w-full max-w-[1600px] px-4 py-6 md:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>

      <AiAssistant />
    </div>
  );
}
