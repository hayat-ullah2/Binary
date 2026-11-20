"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ExternalLink,
  Info,
  LoaderCircle,
  LogOut,
  UserRound,
} from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function AccountStatusScreen({
  status,
  name,
  quotexAccountId,
  onSignOut,
  error,
}: {
  status: string;
  name: string;
  quotexAccountId?: string | null;
  onSignOut: () => Promise<void>;
  error?: string | null;
}) {
  const [accountId, setAccountId] = useState(quotexAccountId ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [checkResult, setCheckResult] = useState<{
    type: "ok" | "info" | "error";
    text: string;
  } | null>(null);
  const rejected = status === "REJECTED";

  useEffect(() => {
    let active = true;
    const checkStatus = async () => {
      try {
        const response = await fetch("/api/account/status", {
          cache: "no-store",
        });
        const data = (await response.json()) as {
          approvalStatus?: string;
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error ?? "Unable to check access status");
        }
        if (active) setRequestError(null);
        if (active && data.approvalStatus === "APPROVED") {
          window.location.reload();
        }
      } catch {
        if (active) {
          setRequestError("Unable to refresh approval status. Please try again.");
        }
      }
    };

    const intervalId = window.setInterval(() => {
      void checkStatus();
    }, 10000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  async function submitRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setRequestError(null);
    try {
      const response = await fetch("/api/account/quotex-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quotexAccountId: accountId }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setRequestError(data.error ?? "Unable to submit your request");
        return;
      }
      window.location.reload();
    } catch {
      setRequestError("Unable to reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function checkStatus() {
    setChecking(true);
    setRequestError(null);
    setCheckResult(null);
    try {
      const response = await fetch("/api/account/status", {
        cache: "no-store",
      });
      const data = (await response.json()) as {
        approvalStatus?: string;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to check access status");
      }

      const current = data.approvalStatus;
      if (current === "APPROVED") {
        // Approved → show a brief confirmation, then land on the dashboard.
        setCheckResult({
          type: "ok",
          text: "Approved! Taking you to your dashboard…",
        });
        window.setTimeout(() => window.location.reload(), 800);
        return;
      }
      if (current === "REJECTED") {
        setCheckResult({
          type: "error",
          text: "Your request was declined. Please contact support.",
        });
      } else {
        setCheckResult({
          type: "info",
          text: "Still pending — an admin hasn't approved your request yet. Please check back shortly.",
        });
      }
    } catch (caught) {
      setRequestError(
        caught instanceof Error
          ? caught.message
          : "Unable to check access status"
      );
    } finally {
      setChecking(false);
    }
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-y-auto px-4 py-8">
      <div className="w-full max-w-md space-y-3.5">
        <section className="flex items-center gap-3 rounded-2xl border border-[#272A34] bg-[#13151D] p-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#20232D] text-muted-foreground">
            <UserRound className="size-6" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold text-foreground">
              Hello, {name}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Access Status:{" "}
              <span className="font-semibold text-amber-400">
                {rejected ? "Request declined" : "Pending"}
              </span>
            </p>
          </div>
          <div className="ml-auto">
            <Logo collapsed />
          </div>
        </section>

        <section className="rounded-2xl border border-[#272A34] bg-[#13151D] p-4">
          <h2 className="text-base font-semibold text-foreground">
            Request Access
          </h2>
          <p className="mt-2 text-xs text-muted-foreground">
            Enter your Quotex Account ID / UID
          </p>

          <form onSubmit={submitRequest} className="mt-4 space-y-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="quotex-account-id" className="sr-only">
                Quotex Account ID / UID
              </Label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="quotex-account-id"
                  name="quotexAccountId"
                  value={accountId}
                  onChange={(event) => setAccountId(event.target.value)}
                  placeholder="Quotex ID / UID"
                  autoComplete="off"
                  minLength={3}
                  maxLength={64}
                  pattern="[a-zA-Z0-9._-]+"
                  title="Use 3–64 letters, numbers, periods, underscores, or hyphens."
                  required
                  className="h-[52px] rounded-xl border-[#282B35] bg-[#1A1C25] pl-10"
                  disabled={submitting}
                />
              </div>
            </div>
            {requestError && (
              <p
                role="alert"
                className="rounded-lg border border-negative/30 bg-negative-muted px-3 py-2 text-xs text-negative"
              >
                {requestError}
              </p>
            )}
            <Button
              type="submit"
              disabled={submitting || accountId.trim().length < 3}
              className="h-[46px] w-full rounded-xl bg-[#8B1E38] text-sm font-semibold text-white hover:bg-[#A52243]"
            >
              {submitting && <LoaderCircle className="size-4 animate-spin" />}
              {quotexAccountId ? "Update Request" : "Submit Request"}
            </Button>
          </form>
        </section>

        <Button
          type="button"
          variant="outline"
          onClick={() => void checkStatus()}
          disabled={checking}
          className="h-10 w-full border-[#272A34] bg-[#13151D] text-sm"
        >
          {checking && <LoaderCircle className="size-4 animate-spin" />}
          Check approval status
        </Button>

        {checkResult && (
          <p
            role="status"
            className={cn(
              "flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-medium",
              checkResult.type === "ok" &&
                "border-positive/30 bg-positive-muted text-positive",
              checkResult.type === "info" &&
                "border-amber-500/30 bg-amber-500/10 text-amber-400",
              checkResult.type === "error" &&
                "border-negative/30 bg-negative-muted text-negative"
            )}
          >
            {checkResult.type === "ok" && (
              <LoaderCircle className="size-4 shrink-0 animate-spin" />
            )}
            {checkResult.text}
          </p>
        )}

        <section className="flex gap-3 rounded-2xl border border-[#272A34] bg-[#13151D] p-4">
          <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div>
            <h2 className="text-xs font-semibold text-foreground">Important</h2>
            <p className="mt-1.5 text-[11px] leading-[1.55] text-muted-foreground">
              Only your Quotex Account ID / UID is required. Never share your
              password, OTP, SID, or other sensitive information. An admin will
              review your request before dashboard access is enabled.
            </p>
          </div>
        </section>

        <Button
          asChild
          variant="outline"
          className="h-11 w-full rounded-xl border-transparent bg-[#1A1C25] font-semibold text-rose-500 hover:bg-[#222530] hover:text-rose-400"
        >
          <Link
            href="https://quotex.com/sign-up/?lid=2433933"
            target="_blank"
            rel="noopener noreferrer"
          >
            OPEN QUOTEX
            <ExternalLink className="size-4" />
          </Link>
        </Button>

        {error && (
          <p className="text-center text-xs text-negative" role="alert">
            {error}
          </p>
        )}

        <Button
          type="button"
          variant="ghost"
          onClick={() => void onSignOut()}
          className="h-10 w-full text-xs text-muted-foreground"
        >
          <LogOut className="size-4" />
          Sign out
        </Button>
      </div>
    </main>
  );
}
