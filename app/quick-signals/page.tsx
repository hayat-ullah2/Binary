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
  CandlestickChart,
  Volume2,
  VolumeX,
  X,
  CalendarOff,
} from "lucide-react";
import {
  TradingViewChart,
  toTradingViewSymbol,
} from "@/components/shared/tradingview-chart";
import { PageHeader } from "@/components/layout/page-header";
import { LiveBadge } from "@/components/shared/live-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn, APP_TIMEZONE, APP_TZ_LABEL, isWeekend } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { VoiceAssistant } from "@/components/shared/voice-assistant";
import { getPair } from "@/lib/mock-data";
import { useQuotes } from "@/lib/hooks/use-quotes";
import {
  QUICK_TIMEFRAMES,
  QUICK_LIVE_PAIRS,
  QUICK_OTC_PAIRS,
  deterministicQuickSignal,
  quickWindowMs,
  type QuickSignal,
} from "@/lib/quick-signal";
import type { Direction, Quote } from "@/types/forex";

type Phase = "idle" | "analyzing" | "entry" | "progress";

function mmss(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function quickPairLabel(pair: string): string {
  const knownPair = getPair(pair);
  return knownPair.symbol === pair
    ? knownPair.label
    : `${pair.slice(0, 3)}/${pair.slice(3)}`;
}

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
  const [mode, setMode] = useState<"OTC" | "LIVE">("OTC");
  const [voice, setVoice] = useState(true);
  const voiceRef = useRef(voice);
  useEffect(() => {
    voiceRef.current = voice;
  }, [voice]);

  // When voice is on, each new signal bumps this to auto-start the AI voice
  // call with a spoken announcement (handled inside <VoiceAssistant>).
  const [signalPrompt, setSignalPrompt] = useState<{
    key: number;
    direction: Direction;
  } | null>(null);
  // Bumped the instant "Generate" is pressed so the call bar opens immediately
  // ("signal aa raha hai…"), before the signal has even resolved.
  const [callOpenKey, setCallOpenKey] = useState(0);

  // Signed-in user's first name — used by the voice assistant.
  const { data: session } = authClient.useSession();
  const firstName = session?.user?.name?.trim().split(/\s+/)[0] ?? "";

  // Prime the TTS voice list — browsers load voices async, so touch it once on
  // mount (and on the voiceschanged event) so an Urdu/Hindi voice is ready.
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.getVoices();
    const handler = () => window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener("voiceschanged", handler);
    return () =>
      window.speechSynthesis.removeEventListener("voiceschanged", handler);
  }, []);
  const [phase, setPhase] = useState<Phase>("idle");
  const [signal, setSignal] = useState<QuickSignal | null>(null);
  const [signalSource, setSignalSource] = useState<
    "tradingview" | "live" | "illustrative" | null
  >(null);
  const [ticketOpen, setTicketOpen] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(0); // trade-in-progress (expiry)
  const [tradeSeconds, setTradeSeconds] = useState(0); // captured expiry (bar total)
  const [entryLeft, setEntryLeft] = useState(0); // "take trade in" countdown
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const idRef = useRef(0);

  // Weekend gate — the Forex market is closed Sat/Sun (UTC+6). Starts false so
  // server and first client render match; the real value is set after mount.
  const [marketClosed, setMarketClosed] = useState(false);
  const [weekendDismissed, setWeekendDismissed] = useState(false);
  const liveMarketClosed = mode === "LIVE" && marketClosed;
  const showWeekendModal = liveMarketClosed && !weekendDismissed;

  // Re-check the day every minute so the modal clears on its own when Monday
  // (UTC+6) arrives, without a page refresh. Deferred into timer callbacks so no
  // setState runs synchronously in the effect body.
  useEffect(() => {
    const check = () => {
      const closed = isWeekend();
      setMarketClosed(closed);
      if (!closed) setWeekendDismissed(false);
    };
    const initial = setTimeout(check, 0);
    const id = setInterval(check, 60_000);
    return () => {
      clearTimeout(initial);
      clearInterval(id);
    };
  }, []);

  const ENTRY_LEAD = 5; // seconds to "take trade in" before the window starts
  const active = phase === "entry" || phase === "progress";

  const { map: quoteMap, source } = useQuotes();
  const pairLabel = quickPairLabel(pair);
  const decimals = getPair(pair).decimals;
  const quote = quoteMap[pair];
  const mid = quote ? (quote.bid + quote.ask) / 2 : null;

  // Live markets can't trade sub-minute, so LIVE mode snaps the expiry to 1m.
  function changeMode(next: "OTC" | "LIVE") {
    setMode(next);
    if (next === "LIVE" && seconds < 60) setSeconds(60);
    if (next === "LIVE" && !QUICK_LIVE_PAIRS.includes(pair)) {
      setPair(QUICK_LIVE_PAIRS[0]);
    }
  }

  const generate = useCallback(() => {
    // Only live FX closes on weekends; OTC uses its synthetic signal path.
    if (mode === "LIVE" && isWeekend()) {
      setMarketClosed(true);
      setWeekendDismissed(false);
      return;
    }
    // Open the voice call bar immediately so it starts "connecting" right away.
    if (voiceRef.current) setCallOpenKey((k) => k + 1);
    setPhase("analyzing");
    setSignal(null);
    const sec = seconds;
    const chosen = pair;
    const started = Date.now();

    // Apply the resolved signal, keeping a short "analyzing" animation.
    const apply = (
      sig: QuickSignal,
      src: "tradingview" | "live" | "illustrative"
    ) => {
      // Start the voice call the INSTANT the signal is known — don't wait for
      // the analyzing animation, so the AI begins talking right away.
      if (voiceRef.current)
        setSignalPrompt((p) => ({
          key: (p?.key ?? 0) + 1,
          direction: sig.direction,
        }));
      const wait = Math.max(0, 600 - (Date.now() - started));
      window.setTimeout(() => {
        setSignal(sig);
        setSignalSource(src);
        setTicketOpen(true);
        setTradeSeconds(sec);
        setEntryLeft(ENTRY_LEAD);
        setPhase("entry");
        idRef.current += 1;
        setRecent((prev) =>
          [
            {
              id: idRef.current,
              pair: chosen,
              seconds: sec,
              direction: sig.direction,
              confidence: sig.confidence,
              time: new Date().toLocaleTimeString("en-US", {
                hour12: false,
                timeZone: APP_TIMEZONE,
              }),
            },
            ...prev,
          ].slice(0, 8)
        );
      }, wait);
    };

    // Fetch the shared, server-computed signal so every device sees the SAME
    // call. Fall back to a deterministic local result only if the API fails.
    void (async () => {
      try {
        const res = await fetch(
          `/api/quick-signal?pair=${encodeURIComponent(chosen)}&tf=${sec}&mode=${mode}`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error("bad response");
        const data = (await res.json()) as QuickSignal & { source?: string };
        const src =
          data.source === "tradingview"
            ? "tradingview"
            : data.source === "live"
              ? "live"
              : "illustrative";
        apply({ direction: data.direction, confidence: data.confidence }, src);
      } catch {
        apply(
          deterministicQuickSignal(
            chosen,
            sec,
            Math.floor(Date.now() / quickWindowMs(sec))
          ),
          "illustrative"
        );
      }
    })();
  }, [mode, pair, seconds]);

  // Phase 1 — "take trade in" countdown; when it hits 0 the trade starts.
  useEffect(() => {
    if (phase !== "entry") return;
    const id = setInterval(() => {
      if (entryLeft <= 0) {
        setPhase("progress");
        setSecondsLeft(tradeSeconds);
      } else {
        setEntryLeft((s) => Math.max(0, s - 1));
      }
    }, 1000);
    return () => clearInterval(id);
  }, [phase, entryLeft, tradeSeconds]);

  // Phase 2 — "trade in progress" expiry countdown.
  useEffect(() => {
    if (phase !== "progress" || secondsLeft <= 0) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [phase, secondsLeft]);

  const ringFraction =
    phase === "analyzing"
      ? 1
      : phase === "entry"
        ? entryLeft / ENTRY_LEAD
        : phase === "progress"
          ? tradeSeconds > 0
            ? secondsLeft / tradeSeconds
            : 0
          : 0;
  const availablePairs =
    mode === "OTC" ? QUICK_OTC_PAIRS : QUICK_LIVE_PAIRS;

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
            {/* Market mode */}
            <div className="rounded-xl border border-border bg-surface/60 p-3">
              <div className="mb-2.5 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Market mode
                </p>
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-positive">
                  <span className="size-1.5 rounded-full bg-positive" />
                  {mode === "OTC" ? "24/7 · Synthetic" : "Live market"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { key: "OTC" as const, sub: "5s → 15m" },
                    { key: "LIVE" as const, sub: "1m → 15m" },
                  ]
                ).map((m) => {
                  const active = mode === m.key;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => changeMode(m.key)}
                      aria-pressed={active}
                      className={cn(
                        "flex flex-col items-center rounded-xl border px-3 py-2.5 transition-colors",
                        active
                          ? "border-primary bg-primary-muted text-primary"
                          : "border-border bg-surface text-muted-foreground hover:border-border-strong hover:text-foreground"
                      )}
                    >
                      <span className="flex items-center gap-1.5 text-sm font-semibold">
                        <span
                          className={cn(
                            "size-1.5 rounded-full",
                            active ? "bg-primary" : "bg-muted-foreground"
                          )}
                        />
                        {m.key}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{m.sub}</span>
                    </button>
                  );
                })}
              </div>
            </div>

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
                    disabled={mode === "LIVE" && tf.seconds < 60}
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
                {availablePairs.map((sym) => (
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
                fraction={ringFraction}
                totalSeconds={seconds}
                pairLabel={pairLabel}
              />

              {active && signalSource && (
                <span
                  className={cn(
                    "mt-4 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
                    signalSource === "tradingview"
                      ? "border-accent/40 bg-accent/10 text-accent"
                      : signalSource === "live"
                        ? "border-positive/30 bg-positive/10 text-positive"
                        : "border-border bg-surface text-muted-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      signalSource === "tradingview"
                        ? "bg-accent"
                        : signalSource === "live"
                          ? "bg-positive"
                          : "bg-muted-foreground"
                    )}
                  />
                  {signalSource === "tradingview"
                    ? "TradingView rating"
                    : signalSource === "live"
                      ? "Live market analysis"
                      : "Illustrative signal"}
                </span>
              )}

              <div className="mt-6 flex w-full flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Button
                  size="lg"
                  onClick={generate}
                  disabled={phase === "analyzing" || liveMarketClosed}
                  className="w-full sm:w-auto"
                >
                  {liveMarketClosed ? (
                    <>
                      <CalendarOff className="size-4" />
                      Market closed
                    </>
                  ) : phase === "analyzing" ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Analyzing…
                    </>
                  ) : (
                    <>
                      <Play className="size-4" />
                      {active ? "New signal" : "Generate signal"}
                    </>
                  )}
                </Button>

                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm">
                  <Switch checked={voice} onCheckedChange={setVoice} />
                  {voice ? (
                    <Volume2 className="size-4 text-primary" />
                  ) : (
                    <VolumeX className="size-4 text-muted-foreground" />
                  )}
                  <span className="text-muted-foreground">Voice</span>
                </label>
              </div>

              <div className="mt-3 w-full max-w-sm">
                <VoiceAssistant
                  userName={firstName}
                  openKey={callOpenKey}
                  signalPrompt={signalPrompt}
                  context={{
                    pairLabel,
                    direction: signal?.direction ?? null,
                    confidence: signal?.confidence ?? null,
                    expirySeconds: seconds,
                    phase,
                  }}
                />
              </div>

              {liveMarketClosed && (
                <p className="mt-3 flex items-center gap-1.5 text-center text-xs text-muted-foreground">
                  <CalendarOff className="size-3.5" />
                  Market closed for the weekend — signals resume Monday.
                </p>
              )}

              {/* Two-phase trade box: take-trade-in → trade-in-progress */}
              {active && signal && (
                <div className="mt-6 w-full max-w-sm space-y-3">
                  <div
                    className={cn(
                      "rounded-2xl border p-4 text-center",
                      signal.direction === "BUY"
                        ? "border-positive/30 bg-positive/10"
                        : "border-negative/30 bg-negative/10"
                    )}
                  >
                    {phase === "entry" ? (
                      <>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                          Take trade in
                        </p>
                        <p
                          className={cn(
                            "mt-1 text-4xl font-bold tabular-nums",
                            signal.direction === "BUY"
                              ? "text-positive"
                              : "text-negative"
                          )}
                        >
                          {entryLeft}s
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                          {secondsLeft > 0 ? "Trade in progress" : "Trade window closed"}
                        </p>
                        <p
                          className={cn(
                            "mt-1 text-4xl font-bold tabular-nums",
                            signal.direction === "BUY"
                              ? "text-positive"
                              : "text-negative"
                          )}
                        >
                          {mmss(secondsLeft)}
                        </p>
                        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              "h-full rounded-full transition-[width] duration-1000 ease-linear",
                              signal.direction === "BUY"
                                ? "bg-positive"
                                : "bg-negative"
                            )}
                            style={{
                              width: `${tradeSeconds > 0 ? (secondsLeft / tradeSeconds) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </>
                    )}
                  </div>

                  <p className="text-center text-[11px] text-muted-foreground">
                    {phase === "entry"
                      ? `Get ready — place the ${signal.direction === "BUY" ? "CALL (UP)" : "PUT (DOWN)"} trade when it hits zero.`
                      : "Trade is running for your selected expiry."}
                  </p>
                </div>
              )}
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
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium text-muted-foreground">
                Times {APP_TZ_LABEL}
              </span>
              {recent.length > 0 && (
                <Badge variant="secondary" className="tabular-nums">
                  {recent.length}
                </Badge>
              )}
            </div>
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
                            {quickPairLabel(r.pair)}
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

      {/* Live market chart for the selected pair (1-minute candles — the finest
          interval TradingView's free widget offers; your expiries are shorter). */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <CandlestickChart className="size-4 text-muted-foreground" />
            {pairLabel} · live chart
          </CardTitle>
          <span className="text-xs text-muted-foreground">1-minute candles</span>
        </CardHeader>
        <CardContent className="p-1 sm:p-2">
          <div className="relative h-[46vh] min-h-[320px] w-full overflow-hidden rounded-lg">
            <TradingViewChart symbol={toTradingViewSymbol(pair)} interval="1" />
            {active && signal && ticketOpen && (
              <ChartTicket
                pair={pair}
                direction={signal.direction}
                quote={quote}
                onClose={() => setTicketOpen(false)}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {showWeekendModal && (
        <WeekendModal onClose={() => setWeekendDismissed(true)} />
      )}
    </div>
  );
}

/* ───────────────────────────── Sub-components ───────────────────────────── */

/** Full-screen notice shown on weekends (Sat/Sun, UTC+6) — market is closed. */
function WeekendModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-background/70 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="weekend-title"
        className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-surface p-6 text-center shadow-2xl"
      >
        <div className="pointer-events-none absolute -top-16 left-1/2 size-40 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-4" />
        </button>

        <span className="relative mx-auto flex size-16 items-center justify-center rounded-full bg-primary-muted text-primary">
          <CalendarOff className="size-8" />
        </span>
        <h2
          id="weekend-title"
          className="relative mt-4 text-xl font-bold text-foreground"
        >
          Market Closed
        </h2>
        <p className="relative mt-2 text-sm text-muted-foreground">
          The Forex market is closed on weekends (Saturday &amp; Sunday). Quick
          Signals will resume automatically on Monday.
        </p>
        <Button onClick={onClose} className="relative mt-5 w-full">
          Got it
        </Button>
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  disabled = false,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border bg-surface text-muted-foreground hover:border-border-strong hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

/** Broker-style trade ticket overlaid on the chart when a signal is live. */
function ChartTicket({
  pair,
  direction,
  quote,
  onClose,
}: {
  pair: string;
  direction: Direction;
  quote: Quote | undefined;
  onClose: () => void;
}) {
  const meta = getPair(pair);
  const dec = meta.decimals;
  const pip = meta.pipSize;
  const bid = quote?.bid ?? null;
  const ask = quote?.ask ?? null;
  const mid = bid !== null && ask !== null ? (bid + ask) / 2 : null;
  const isBuy = direction === "BUY";
  const entry = isBuy ? (ask ?? mid) : (bid ?? mid);
  const sl = entry !== null ? (isBuy ? entry - 20 * pip : entry + 20 * pip) : null;
  const tp = entry !== null ? (isBuy ? entry + 40 * pip : entry - 40 * pip) : null;
  const fmt = (v: number | null) => (v === null ? "—" : v.toFixed(dec));

  return (
    <div className="absolute left-2 top-2 z-10 w-[220px] max-w-[72%] rounded-xl border border-border bg-background/95 p-3 shadow-2xl backdrop-blur-sm sm:left-3 sm:top-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          <span className={cn("size-1.5 rounded-full", isBuy ? "bg-positive" : "bg-negative")} />
          Signal ticket
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close ticket"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div
          className={cn(
            "rounded-lg border px-2 py-1.5",
            !isBuy ? "border-negative/60 bg-negative/10" : "border-border bg-surface"
          )}
        >
          <p className="text-[10px] font-semibold text-negative">Sell</p>
          <p className="text-sm font-bold tabular-nums text-foreground">{fmt(bid)}</p>
        </div>
        <div
          className={cn(
            "rounded-lg border px-2 py-1.5",
            isBuy ? "border-positive/60 bg-positive/10" : "border-border bg-surface"
          )}
        >
          <p className="text-[10px] font-semibold text-positive">Buy</p>
          <p className="text-sm font-bold tabular-nums text-foreground">{fmt(ask)}</p>
        </div>
      </div>

      <dl className="mt-2.5 space-y-1.5 text-xs">
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Amount</dt>
          <dd className="font-semibold tabular-nums text-foreground">0.01 lot</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Stop loss</dt>
          <dd className="font-semibold tabular-nums text-negative">{fmt(sl)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Take profit</dt>
          <dd className="font-semibold tabular-nums text-positive">{fmt(tp)}</dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={onClose}
        className={cn(
          "mt-3 w-full rounded-lg py-2 text-xs font-semibold text-white transition-[filter] hover:brightness-110",
          isBuy ? "bg-positive" : "bg-negative"
        )}
      >
        {isBuy ? "Buy" : "Sell"} {meta.label} @ {fmt(entry)}
      </button>
      <p className="mt-1.5 text-center text-[9px] text-muted-foreground">
        Illustrative — place the trade manually on your broker
      </p>
    </div>
  );
}

function SignalCircle({
  phase,
  signal,
  fraction,
  totalSeconds,
  pairLabel,
}: {
  phase: Phase;
  signal: QuickSignal | null;
  fraction: number;
  totalSeconds: number;
  pairLabel: string;
}) {
  const size = 280;
  const stroke = 10;
  const cx = size / 2;
  const trackR = 104;
  const circ = 2 * Math.PI * trackR;

  const active = phase === "entry" || phase === "progress";
  const offset = circ * (1 - fraction);

  const isBuy = signal?.direction === "BUY";
  const ringColor = active
    ? isBuy
      ? "var(--positive)"
      : "var(--negative)"
    : "var(--primary)";

  // Glow / pulse tone follows the state.
  const glowClass = active
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

        {active && signal && (
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
              {isBuy ? "CALL" : "PUT"}
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
          </>
        )}
      </div>
    </div>
  );
}
