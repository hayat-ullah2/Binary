"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  LockKeyhole,
  LoaderCircle,
  Mail,
  ShieldCheck,
  UserRound,
  Zap,
  Scale,
  BarChart3,
  Bot,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

const FEATURES: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: Zap, title: "Real-time signals", desc: "EMA · RSI · MACD with confidence scoring." },
  { icon: Scale, title: "Built-in risk tools", desc: "Position sizing and 1:2 reward-to-risk." },
  { icon: BarChart3, title: "Live analytics", desc: "Track your performance at a glance." },
  { icon: Bot, title: "AI assistant", desc: "Strategies, automation and insights." },
];

export function SignUpScreen() {
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationSubmitted, setRegistrationSubmitted] = useState(false);
  const isSignUp = mode === "signup";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (isSignUp) {
      const name = String(formData.get("name") ?? "").trim();
      const confirmPassword = String(formData.get("confirmPassword") ?? "");
      if (!name) {
        setError("Enter your full name.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }

      setSubmitting(true);
      try {
        const result = await authClient.signUp.email({
          name,
          email,
          password,
        });
        if (result.error) {
          setError(result.error.message ?? "Unable to create account");
          return;
        }
        setRegistrationSubmitted(true);
        window.location.reload();
      } catch {
        setError("Unable to reach the authentication service. Try again.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    setSubmitting(true);
    try {
      const result = await authClient.signIn.email({ email, password });
      if (result.error) {
        setError(result.error.message ?? "Unable to log in");
        return;
      }
      window.location.reload();
    } catch {
      setError("Unable to reach the authentication service. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main
      role="dialog"
      aria-modal="true"
      aria-labelledby="signup-title"
      className="fixed inset-0 z-[100] overflow-y-auto bg-background"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="absolute -left-40 -top-48 size-[32rem] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute -bottom-56 -right-36 size-[34rem] rounded-full bg-accent/10 blur-[140px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_78%)]" />
      </div>

      {/* Scrollable, centered wrapper — min-h-dvh keeps it centered when it fits,
          and the py gap stays reachable when the card is taller than the viewport. */}
      <div className="relative flex min-h-dvh items-center justify-center px-4 py-10 sm:px-6">
      <section className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-border bg-surface/90 shadow-2xl shadow-black/30 backdrop-blur-xl lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="relative hidden flex-col overflow-hidden border-r border-border bg-surface-elevated/60 p-10 lg:flex">
          {/* Radar decoration */}
          <div
            aria-hidden="true"
            className="absolute -right-28 top-10 size-72 rounded-full border border-primary/10"
          >
            <div className="absolute inset-8 rounded-full border border-primary/10" />
            <div className="absolute inset-16 rounded-full border border-primary/10" />
            <div className="absolute left-1/2 top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_30px_8px_rgba(126,224,161,0.25)]" />
          </div>

          <Logo />

          <div className="relative z-10 mt-12 flex flex-1 flex-col justify-center">
            <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary-muted/50 px-3 py-1.5 text-xs font-medium text-primary">
              <span className="size-1.5 rounded-full bg-primary" />
              A sharper view of the market
            </div>
            <h1 className="text-[2.6rem] font-bold leading-[1.05] tracking-tight text-foreground">
              Make your next move
              <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                with intention.
              </span>
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
              Bring your market watch, signals, and risk tools together in one
              focused trading workspace.
            </p>

            <ul className="mt-9 space-y-4">
              {FEATURES.map((f) => (
                <li key={f.title} className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
                    <f.icon className="size-4" />
                  </span>
                  <div className="pt-0.5">
                    <p className="text-sm font-semibold text-foreground">{f.title}</p>
                    <p className="text-xs leading-5 text-muted-foreground">{f.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative z-10 mt-10 flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 text-primary" />
            Trading involves risk. Protect your capital.
          </div>
        </aside>

        <div className="p-6 sm:p-10 lg:p-12">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>

          <div className="mx-auto max-w-md">
            <div className="mb-7">
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-muted/40 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
                <Check className="size-3" />
                {isSignUp ? "Get started" : "Welcome back"}
              </div>
              <h2
                id="signup-title"
                className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
              >
                {isSignUp ? "Create your account" : "Log in to your account"}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {isSignUp
                  ? "Start building a more focused trading routine."
                  : "Enter your email and password to continue."}
              </p>
            </div>

            {registrationSubmitted ? (
              <div
                className="rounded-2xl border border-primary/20 bg-primary-muted/30 p-5"
                role="status"
              >
                <CheckCircle2 className="size-6 text-primary" />
                <h3 className="mt-3 font-semibold text-foreground">
                  Registration received
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Your account is waiting for admin approval. You can log in
                  after your access has been approved.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setRegistrationSubmitted(false);
                    setMode("login");
                  }}
                  className="mt-4 w-full"
                >
                  Go to login
                </Button>
              </div>
            ) : (
              <>
            <form className="space-y-4" onSubmit={handleSubmit}>
              {isSignUp && (
                <div className="space-y-1.5">
                  <Label htmlFor="auth-full-name">Full name</Label>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="auth-full-name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      placeholder="Your full name"
                      required
                      className="h-11 bg-background/70 pl-10"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="auth-email">Email address</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="auth-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    required
                    className="h-11 bg-background/70 pl-10"
                  />
                </div>
              </div>

              <div className={isSignUp ? "grid gap-4 sm:grid-cols-2" : ""}>
                <div className="space-y-1.5">
                  <Label htmlFor="auth-password">Password</Label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="auth-password"
                      name="password"
                      type="password"
                      autoComplete={isSignUp ? "new-password" : "current-password"}
                      placeholder={isSignUp ? "Create a password" : "Your password"}
                      minLength={isSignUp ? 8 : undefined}
                      maxLength={128}
                      required
                      className="h-11 bg-background/70 pl-10"
                    />
                  </div>
                </div>

                {isSignUp && (
                  <div className="space-y-1.5">
                    <Label htmlFor="auth-confirm-password">
                      Confirm password
                    </Label>
                    <div className="relative">
                      <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="auth-confirm-password"
                        name="confirmPassword"
                        type="password"
                        autoComplete="new-password"
                        placeholder="Confirm password"
                        required
                        className="h-11 bg-background/70 pl-10"
                      />
                    </div>
                  </div>
                )}
              </div>

              {isSignUp && (
                <p className="pt-1 text-xs leading-5 text-muted-foreground">
                  By continuing, you agree to our Terms of Service and Privacy
                  Policy.
                </p>
              )}

              <Button
                type="submit"
                disabled={submitting}
                className="h-11 w-full text-sm font-semibold"
              >
                {submitting ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    {isSignUp ? "Creating account…" : "Logging in…"}
                  </>
                ) : (
                  <>
                    {isSignUp ? "Create account" : "Log in"}
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
              {error && (
                <p
                  className="rounded-lg border border-negative/30 bg-negative-muted px-3 py-2 text-sm text-negative"
                  role="alert"
                >
                  {error}
                </p>
              )}
            </form>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-surface px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            <Button
              asChild
              variant="outline"
              className="h-11 w-full border-transparent bg-[#229ED9] text-sm font-semibold text-white hover:bg-[#1D8FC7] hover:text-white"
            >
              <Link
                href="https://t.me/+hP5YOnsg_c85ODA0"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                  className="size-[18px]"
                >
                  <path d="M21.8 4.2 18.6 19c-.24 1.05-.86 1.3-1.74.81l-4.81-3.55-2.32 2.23c-.26.26-.48.48-.98.48l.35-4.9 8.92-8.06c.39-.35-.08-.55-.6-.2L6.39 12.9l-4.7-1.47c-1.02-.32-1.04-1.02.21-1.5L20.27 2.7c.85-.31 1.59.21 1.53 1.5Z" />
                </svg>
                Join us on Telegram
              </Link>
            </Button>

            <p className="mt-5 text-center text-sm text-muted-foreground">
              {isSignUp ? "Already have an account?" : "New to SHARP X REBEL?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode(isSignUp ? "login" : "signup");
                }}
                className="font-semibold text-primary underline-offset-4 transition-colors hover:text-primary/80 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {isSignUp ? "Log in" : "Create an account"}
              </button>
            </p>

            <div
              className="mt-5 flex items-start gap-2.5 rounded-xl border border-border bg-background/50 px-3.5 py-2.5"
              role="status"
            >
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              <p className="text-xs leading-5 text-muted-foreground">
                New accounts require admin approval before dashboard access.
              </p>
            </div>
              </>
            )}
          </div>
        </div>
      </section>
      </div>
    </main>
  );
}
