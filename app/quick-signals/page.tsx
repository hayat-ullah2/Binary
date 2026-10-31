"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Zap,
  ArrowUp,
  ArrowDown,
  Loader2,
  Play,
  Timer,
  History as HistoryIcon,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { LiveBadge } from "@/components/shared/live-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getPair } from "@/lib/mock-data";
import { useQuotes } from "@/lib/hooks/use-quotes";
import {
  QUICK_TIMEFRAMES,
  QUICK_PAIRS,
  generateQuickSignal,
  type QuickSignal,
} from "@/lib/quick-signal";
import type { Direction } from "@/types/forex";

type Phase = "idle" | "analyzing" | "result";

interface RecentItem {
  id: number;
  pair: string;
  seconds: number;
  direction: Direction;
  confidence: number;
  time: string;
}

export default function QuickSignalsPage() {
  const [seconds, setSeconds] = useState(30);
  const [pair, setPair] = useState("EURUSD");
  const [phase, setPhase] = useState<Phase>("idle");
  const [signal, setSignal] = useState<QuickSignal | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [auto, setAuto] = useState(false);
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const idRef = useRef(0);

  const { map: quoteMap, source } = useQuotes();
  const pairLabel = getPair(pair).label;
  const decimals = getPair(pair).decimals;
  const quote = quoteMap[pair];
  const mid = quote ? (quote.bid + quote.ask) / 2 : null;

  const generate = useCallback(() => {
    setPhase("analyzing");
    setSignal(null);
    const bias = quoteMap[pair]?.dayChangePercent ?? 0;
    const sec = seconds;
    const chosen = pair;
    window.setTimeout(() => {
      const sig = generateQuickSignal(bias);
      setSignal(sig);
      setSecondsLeft(sec);
      setPhase("result");
      idRef.current += 1;
      setRecent((prev) =>
        [
          {
            id: idRef.current,
            pair: chosen,
            seconds: sec,
            direction: sig.direction,
            confidence: sig.confidence,
            time: new Date().toLocaleTimeString("en-US", { hour12: false }),
          },
          ...prev,
        ].slice(0, 8)
      );
    }, 1300);
  }, [pair, seconds, quoteMap]);

  // Countdown while a signal is live.
  useEffect(() => {
    if (phase !== "result" || secondsLeft <= 0) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [phase, secondsLeft]);

  // Auto mode: regenerate shortly after the window closes.
  useEffect(() => {
    if (!auto || phase !== "result" || secondsLeft > 0) return;
    const t = setTimeout(() => generate(), 1800);
    return () => clearTimeout(t);
  }, [auto, phase, secondsLeft, generate]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quick Signals"
        description="Quotex-style timed signals. Pick an expiry and a pair, then generate a BUY / SELL call for that window."
        actions={<LiveBadge source={source} />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Signal console */}
        <Card className="relative overflow-hidden lg:col-span-2">
          {/* soft top glow */}
          <div className="pointer-events-none absolute -top-24 left-1/2 size-64 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
          <CardContent className="relative space-y-5 p-5">
            {/* Selected pair status */}
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface/60 p-3">
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-muted text-primary">
                  <Zap className="size-4" />
                </span>
                <div className="leading-tight">
                  <p className="text-sm font-semibold text-foreground">{pairLabel}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {seconds}s expiry window
                  </p>
                </div>
              </div>
              <div className="text-right leading-tight">
                {quote && mid !== null ? (
                  <>
                    <p className="text-sm font-semibold tabular-nums text-foreground">
                      {mid.toFixed(decimals)}
                    </p>
                    <p
                      className={cn(
                        "text-xs font-medium tabular-nums",
                        quote.dayChangePercent >= 0 ? "text-positive" : "text-negative"
                      )}
                    >
                      {quote.dayChangePercent >= 0 ? "+" : "−"}
                      {Math.abs(quote.dayChangePercent).toFixed(2)}%
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
              </div>
            </div>

            {/* Expiry chips */}
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Expiry
              </p>
              <div className="flex flex-wrap gap-2">
                {QUICK_TIMEFRAMES.map((tf) => (
                  <Chip
                    key={tf.seconds}
                    active={seconds === tf.seconds}
                    onClick={() => setSeconds(tf.seconds)}
                  >
                    {tf.label}
                  </Chip>
                ))}
              </div>
            </div>

            {/* Pair chips */}
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Currency pair
              </p>
              <div className="flex flex-wrap gap-2">
                {QUICK_PAIRS.map((sym) => (
                  <Chip
                    key={sym}
                    active={pair === sym}
                    onClick={() => setPair(sym)}
                  >
                    {getPair(sym).label}
                  </Chip>
                ))}
              </div>
            </div>

            {/* The circle */}
            <div className="flex flex-col items-center pt-4">
              <SignalCircle
                phase={phase}
                signal={signal}
                secondsLeft={secondsLeft}
                totalSeconds={seconds}
                pairLabel={pairLabel}
              />

              <div className="mt-8 flex w-full flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Button
                  size="lg"
                  onClick={generate}
                  disabled={phase === "analyzing"}
                  className="w-full sm:w-auto"
                >
                  {phase === "analyzing" ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Analyzing…
                    </>
                  ) : (
                    <>
                      <Play className="size-4" />
                      {phase === "result" ? "New signal" : "Generate signal"}
                    </>
                  )}
                </Button>

                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm">
                  <Switch checked={auto} onCheckedChange={setAuto} />
                  <span className="text-muted-foreground">Auto-generate</span>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent signals */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <HistoryIcon className="size-4 text-muted-foreground" />
              Recent signals
            </CardTitle>
            {recent.length > 0 && (
              <Badge variant="secondary" className="tabular-nums">
                {recent.length}
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-14 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-primary-muted text-primary">
                  <Timer className="size-6" />
                </span>
                <p className="mt-3 text-sm font-medium text-foreground">
                  No signals yet
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Generate your first call to see it here.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {recent.map((r) => {
                  const isBuy = r.direction === "BUY";
                  return (
                    <li
                      key={r.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={cn(
                            "flex size-8 shrink-0 items-center justify-center rounded-full",
                            isBuy
                              ? "bg-positive-muted text-positive"
                              : "bg-negative-muted text-negative"
                          )}
                        >
                          {isBuy ? (
                            <ArrowUp className="size-4" />
                          ) : (
                            <ArrowDown className="size-4" />
                          )}
                        </span>
                        <div className="leading-tight">
                          <p className="text-sm font-medium text-foreground">
                            {getPair(r.pair).label}
                          </p>
                          <p className="text-[11px] text-muted-foreground tabular-nums">
                            {r.seconds}s · {r.time}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={cn(
                            "text-sm font-semibold",
                            isBuy ? "text-positive" : "text-negative"
                          )}
                        >
                          {r.direction}
                        </p>
                        <p className="text-[11px] text-muted-foreground tabular-nums">
                          {r.confidence}%
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ───────────────────────────── Sub-components ───────────────────────────── */

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border bg-surface text-muted-foreground hover:border-border-strong hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function SignalCircle({
  phase,
  signal,
  secondsLeft,
  totalSeconds,
  pairLabel,
}: {
  phase: Phase;
  signal: QuickSignal | null;
  secondsLeft: number;
  totalSeconds: number;
  pairLabel: string;
}) {
  const size = 280;
  const stroke = 10;
  const cx = size / 2;
  const trackR = 104;
  const circ = 2 * Math.PI * trackR;

  const fraction =
    phase === "result"
      ? secondsLeft / totalSeconds
      : phase === "analyzing"
        ? 1
        : 0;
  const offset = circ * (1 - fraction);

  const isBuy = signal?.direction === "BUY";
  const ringColor =
    phase === "result"
      ? isBuy
        ? "var(--positive)"
        : "var(--negative)"
      : "var(--primary)";
  const expired = phase === "result" && secondsLeft <= 0;

  // Glow / pulse tone follows the state.
  const glowClass =
    phase === "result"
      ? isBuy
        ? "bg-positive/25"
        : "bg-negative/25"
      : "bg-primary/20";

  const TICKS = 56;

  return (
    <div className="relative aspect-square w-full max-w-[280px]">
      {/* Radial glow backdrop */}
      <div
        className={cn(
          "pointer-events-none absolute left-1/2 top-1/2 size-[60%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl transition-colors duration-500",
          glowClass,
          phase === "analyzing" && "motion-safe:animate-pulse"
        )}
      />

      {/* Idle "ready" pulse rings */}
      {phase === "idle" && (
        <>
          <span
            className="pointer-events-none absolute left-1/2 top-1/2 size-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/30 motion-safe:animate-ping"
            style={{ animationDuration: "2.8s" }}
          />
          <span
            className="pointer-events-none absolute left-1/2 top-1/2 size-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/20 motion-safe:animate-ping"
            style={{ animationDuration: "2.8s", animationDelay: "1.4s" }}
          />
        </>
      )}

      <svg viewBox={`0 0 ${size} ${size}`} className="relative h-full w-full">
        <defs>
          <filter id="qs-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Radar tick marks */}
        <g>
          {Array.from({ length: TICKS }).map((_, i) => {
            const major = i % 7 === 0;
            return (
              <line
                key={i}
                x1={cx}
                y1={16}
                x2={cx}
                y2={major ? 29 : 24}
                stroke={major ? "var(--primary)" : "var(--border)"}
                strokeWidth={major ? 2 : 1}
                strokeLinecap="round"
                opacity={major ? 0.55 : 0.35}
                transform={`rotate(${(i / TICKS) * 360} ${cx} ${cx})`}
              />
            );
          })}
        </g>

        {/* Countdown ring (rotated so it starts at the top) */}
        <g transform={`rotate(-90 ${cx} ${cx})`}>
          <circle
            cx={cx}
            cy={cx}
            r={trackR}
            fill="none"
            stroke="var(--muted)"
            strokeWidth={stroke}
          />
          <circle
            cx={cx}
            cy={cx}
            r={trackR}
            fill="none"
            stroke={ringColor}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            filter="url(#qs-glow)"
            className={cn(
              "transition-[stroke-dashoffset] duration-1000 ease-linear",
              phase === "analyzing" && "motion-safe:animate-pulse"
            )}
          />
        </g>
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
        {phase === "idle" && (
          <>
            <span className="relative flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/25">
              <span className="absolute inset-0 rounded-full bg-primary/15 blur-md" />
              <Zap className="relative size-8" />
            </span>
            <p className="mt-4 text-base font-semibold text-foreground">
              Ready to generate
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {pairLabel} · {totalSeconds}s window
            </p>
          </>
        )}

        {phase === "analyzing" && (
          <>
            <span className="flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Loader2 className="size-9 animate-spin" />
            </span>
            <p className="mt-4 text-base font-semibold text-foreground">
              Analyzing {pairLabel}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Reading momentum…
            </p>
          </>
        )}

        {phase === "result" && signal && (
          <>
            <span
              className={cn(
                "flex size-14 items-center justify-center rounded-full",
                isBuy ? "bg-positive/15 text-positive" : "bg-negative/15 text-negative"
              )}
            >
              {isBuy ? (
                <ArrowUp className="size-7" />
              ) : (
                <ArrowDown className="size-7" />
              )}
            </span>
            <p
              className={cn(
                "mt-2 text-3xl font-extrabold tracking-tight",
                isBuy ? "text-positive" : "text-negative"
              )}
            >
              {signal.direction}
            </p>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {isBuy ? "Higher ▲" : "Lower ▼"}
            </p>
            <p className="mt-2 text-sm">
              <span className="font-bold tabular-nums text-foreground">
                {signal.confidence}%
              </span>{" "}
              <span className="text-muted-foreground">confidence</span>
            </p>
            <p
              className={cn(
                "mt-1 text-xs font-medium tabular-nums",
                expired ? "text-muted-foreground" : "text-foreground"
              )}
            >
              {expired ? "Window closed" : `${secondsLeft}s remaining`}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
