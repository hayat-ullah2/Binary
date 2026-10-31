"use client";

import { useMemo, useState } from "react";
import {
  Calculator,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Target,
  Scale,
  Ruler,
  Layers,
  Coins,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { DemoDataTag } from "@/components/shared/disclaimer-banner";
import { PriceLadder } from "@/components/shared/price-ladder";
import { RiskRewardCard } from "@/components/shared/risk-reward-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CURRENCY_PAIRS, getPair } from "@/lib/mock-data";
import { computeRisk, validateLevels } from "@/lib/calculations";
import { cn, formatCurrency, formatCompact, formatPrice } from "@/lib/utils";
import type { Direction } from "@/types/forex";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Parse a user-entered number. Empty / non-finite input -> null (invalid). */
function parseNum(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

interface LevelDefaults {
  entry: string;
  stopLoss: string;
  takeProfit: string;
}

/** Sensible BUY-oriented sample levels per instrument (SL below, TP above). */
const PAIR_DEFAULTS: Record<string, LevelDefaults> = {
  EURUSD: { entry: "1.0850", stopLoss: "1.0820", takeProfit: "1.0920" },
  GBPUSD: { entry: "1.2700", stopLoss: "1.2660", takeProfit: "1.2780" },
  USDJPY: { entry: "150.50", stopLoss: "150.20", takeProfit: "151.10" },
  XAUUSD: { entry: "2350.00", stopLoss: "2345.00", takeProfit: "2362.00" },
  AUDUSD: { entry: "0.6600", stopLoss: "0.6575", takeProfit: "0.6650" },
  USDCHF: { entry: "0.9050", stopLoss: "0.9025", takeProfit: "0.9100" },
  USDCAD: { entry: "1.3600", stopLoss: "1.3575", takeProfit: "1.3660" },
  NZDUSD: { entry: "0.6100", stopLoss: "0.6080", takeProfit: "0.6150" },
  EURGBP: { entry: "0.8550", stopLoss: "0.8530", takeProfit: "0.8595" },
  EURJPY: { entry: "162.50", stopLoss: "162.20", takeProfit: "163.10" },
  GBPJPY: { entry: "191.50", stopLoss: "191.10", takeProfit: "192.30" },
};

function defaultsFor(symbol: string): LevelDefaults {
  return (
    PAIR_DEFAULTS[symbol] ?? {
      entry: formatPrice(getPair(symbol).pipSize * 10850, getPair(symbol).decimals),
      stopLoss: "",
      takeProfit: "",
    }
  );
}

const PAIR_OPTIONS = CURRENCY_PAIRS.map((p) => ({ label: p.label, value: p.symbol }));

const DEFAULT_SYMBOL = "EURUSD";
const RISK_MIN = 0.1;
const RISK_MAX = 5;

/* ------------------------------------------------------------------ */
/* Small presentational stat tile                                      */
/* ------------------------------------------------------------------ */

function StatTile({
  label,
  value,
  icon: Icon,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  icon: typeof Scale;
  hint?: string;
  tone?: "default" | "positive" | "negative" | "primary";
}) {
  const toneText =
    tone === "positive"
      ? "text-positive"
      : tone === "negative"
        ? "text-negative"
        : tone === "primary"
          ? "text-primary"
          : "text-foreground";
  return (
    <div className="rounded-lg bg-surface p-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5" aria-hidden="true" />
        <span>{label}</span>
      </div>
      <p className={cn("mt-1.5 text-lg font-semibold tabular-nums", toneText)}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function RiskCalculatorPage() {
  const [symbol, setSymbol] = useState<string>(DEFAULT_SYMBOL);
  const [direction, setDirection] = useState<Direction>("BUY");
  const [balanceStr, setBalanceStr] = useState("10000");
  const [riskStr, setRiskStr] = useState("1");
  const [entryStr, setEntryStr] = useState(defaultsFor(DEFAULT_SYMBOL).entry);
  const [stopStr, setStopStr] = useState(defaultsFor(DEFAULT_SYMBOL).stopLoss);
  const [targetStr, setTargetStr] = useState(defaultsFor(DEFAULT_SYMBOL).takeProfit);

  const pair = getPair(symbol);

  /** Switching instrument re-seeds sensible, in-scale sample levels. */
  function handleSymbolChange(next: string) {
    setSymbol(next);
    const d = defaultsFor(next);
    setEntryStr(d.entry);
    setStopStr(d.stopLoss);
    setTargetStr(d.takeProfit);
    setDirection("BUY");
  }

  function handleReset() {
    setSymbol(DEFAULT_SYMBOL);
    setDirection("BUY");
    setBalanceStr("10000");
    setRiskStr("1");
    const d = defaultsFor(DEFAULT_SYMBOL);
    setEntryStr(d.entry);
    setStopStr(d.stopLoss);
    setTargetStr(d.takeProfit);
  }

  /* ---- parse & validate ---- */
  const balance = parseNum(balanceStr);
  const risk = parseNum(riskStr);
  const entry = parseNum(entryStr);
  const stop = parseNum(stopStr);
  const target = parseNum(targetStr); // optional

  const balanceError =
    balance === null ? "Enter an account balance." : balance <= 0 ? "Balance must be greater than 0." : null;
  const riskError =
    risk === null
      ? "Enter a risk percentage."
      : risk < RISK_MIN || risk > RISK_MAX
        ? `Risk must be between ${RISK_MIN}% and ${RISK_MAX}%.`
        : null;
  const entryError =
    entry === null ? "Enter an entry price." : entry <= 0 ? "Entry must be greater than 0." : null;
  const stopError =
    stop === null
      ? "Enter a stop-loss price."
      : stop <= 0
        ? "Stop-loss must be greater than 0."
        : entry !== null && stop === entry
          ? "Stop-loss cannot equal entry."
          : null;
  // Take-profit is optional: only an error if something was typed but it is unusable.
  const targetError =
    targetStr.trim() !== "" && (target === null || target <= 0)
      ? "Take-profit must be a positive number."
      : null;

  // Directional level validation (only once the core numbers are usable).
  const levelErrors =
    entry !== null &&
    entry > 0 &&
    stop !== null &&
    stop > 0 &&
    !stopError &&
    !targetError
      ? validateLevels(
          direction,
          entry,
          stop,
          target !== null && targetStr.trim() !== "" ? target : undefined,
        )
      : [];

  const stopLevelError = levelErrors.find((e) => e.toLowerCase().includes("stop")) ?? null;
  const targetLevelError = levelErrors.find((e) => e.toLowerCase().includes("take-profit")) ?? null;

  const hasTarget = targetStr.trim() !== "" && target !== null && target > 0;

  const isValid =
    !balanceError &&
    !riskError &&
    !entryError &&
    !stopError &&
    !targetError &&
    levelErrors.length === 0 &&
    balance !== null &&
    risk !== null &&
    entry !== null &&
    stop !== null;

  /* ---- compute ---- */
  const result = useMemo(() => {
    if (!isValid || balance === null || risk === null || entry === null || stop === null) {
      return null;
    }
    return computeRisk({
      accountBalance: balance,
      riskPercent: risk,
      entry,
      stopLoss: stop,
      takeProfit: hasTarget && target !== null ? target : undefined,
      pair,
    });
  }, [isValid, balance, risk, entry, stop, hasTarget, target, pair]);

  // Live risk-amount preview (works even before levels are valid).
  const liveRiskAmount =
    balance !== null && balance > 0 && risk !== null && risk >= RISK_MIN && risk <= RISK_MAX
      ? (balance * risk) / 100
      : null;

  const sliderValue = risk !== null ? Math.min(RISK_MAX, Math.max(RISK_MIN, risk)) : 1;

  /* ---------------------------------------------------------------- */

  return (
    <div className="space-y-6">
      <PageHeader
        title="Risk Calculator"
        description="Illustrative position-sizing for a single setup. Results are sample calculations only — not trade advice."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ------------------------------- INPUTS ------------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="size-4 text-primary" />
              Trade inputs
            </CardTitle>
            <CardDescription>
              Adjust the setup — results on the right recalculate instantly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Pair + direction */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="rc-pair">Currency pair</Label>
                <Select value={symbol} onValueChange={handleSymbolChange}>
                  <SelectTrigger id="rc-pair" aria-label="Currency pair">
                    <SelectValue placeholder="Select a pair" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAIR_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  {pair.category} · {pair.decimals} decimals · pip {pair.pipSize}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Direction</Label>
                <div className="grid grid-cols-2 gap-2" role="group" aria-label="Trade direction">
                  <Button
                    type="button"
                    variant={direction === "BUY" ? "default" : "outline"}
                    aria-pressed={direction === "BUY"}
                    onClick={() => setDirection("BUY")}
                    className={cn(
                      direction === "BUY" &&
                        "bg-positive text-background hover:bg-positive/90",
                    )}
                  >
                    <TrendingUp className="size-4" />
                    Buy
                  </Button>
                  <Button
                    type="button"
                    variant={direction === "SELL" ? "default" : "outline"}
                    aria-pressed={direction === "SELL"}
                    onClick={() => setDirection("SELL")}
                    className={cn(
                      direction === "SELL" &&
                        "bg-negative text-background hover:bg-negative/90",
                    )}
                  >
                    <TrendingDown className="size-4" />
                    Sell
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Affects stop / target validation only.
                </p>
              </div>
            </div>

            {/* Balance */}
            <div className="space-y-1.5">
              <Label htmlFor="rc-balance">Account balance</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  id="rc-balance"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={balanceStr}
                  onChange={(e) => setBalanceStr(e.target.value)}
                  aria-invalid={!!balanceError}
                  className="pl-7 tabular-nums"
                />
              </div>
              {balanceError ? (
                <p className="text-[11px] text-negative">{balanceError}</p>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  Your total trading capital (account currency assumed USD).
                </p>
              )}
            </div>

            {/* Risk percent: slider + numeric input kept in sync */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="rc-risk">Risk per trade</Label>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {liveRiskAmount !== null ? (
                    <>
                      ≈{" "}
                      <span className="font-semibold text-foreground">
                        {formatCurrency(liveRiskAmount)}
                      </span>{" "}
                      at risk
                    </>
                  ) : (
                    "—"
                  )}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Slider
                  value={[sliderValue]}
                  min={RISK_MIN}
                  max={RISK_MAX}
                  step={0.1}
                  onValueChange={([n]) => setRiskStr(String(n))}
                  aria-label="Risk percent"
                  className="flex-1"
                />
                <div className="relative w-24 shrink-0">
                  <Input
                    id="rc-risk"
                    type="number"
                    inputMode="decimal"
                    min={RISK_MIN}
                    max={RISK_MAX}
                    step={0.1}
                    value={riskStr}
                    onChange={(e) => setRiskStr(e.target.value)}
                    aria-invalid={!!riskError}
                    className="pr-6 tabular-nums"
                  />
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    %
                  </span>
                </div>
              </div>
              {riskError ? (
                <p className="text-[11px] text-negative">{riskError}</p>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  Conservative setups typically risk {RISK_MIN}%–2% of the balance per trade.
                </p>
              )}
            </div>

            {/* Prices */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="rc-entry">Entry price</Label>
                <Input
                  id="rc-entry"
                  type="number"
                  inputMode="decimal"
                  step={pair.pipSize}
                  value={entryStr}
                  onChange={(e) => setEntryStr(e.target.value)}
                  aria-invalid={!!entryError}
                  className="tabular-nums"
                />
                {entryError ? (
                  <p className="text-[11px] text-negative">{entryError}</p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">Planned fill price.</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rc-stop">Stop-loss</Label>
                <Input
                  id="rc-stop"
                  type="number"
                  inputMode="decimal"
                  step={pair.pipSize}
                  value={stopStr}
                  onChange={(e) => setStopStr(e.target.value)}
                  aria-invalid={!!stopError || !!stopLevelError}
                  className="tabular-nums"
                />
                {stopError || stopLevelError ? (
                  <p className="text-[11px] text-negative">{stopError ?? stopLevelError}</p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    {direction === "BUY" ? "Below entry for a buy." : "Above entry for a sell."}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rc-target">Take-profit</Label>
                <Input
                  id="rc-target"
                  type="number"
                  inputMode="decimal"
                  step={pair.pipSize}
                  value={targetStr}
                  onChange={(e) => setTargetStr(e.target.value)}
                  aria-invalid={!!targetError || !!targetLevelError}
                  className="tabular-nums"
                />
                {targetError || targetLevelError ? (
                  <p className="text-[11px] text-negative">
                    {targetError ?? targetLevelError}
                  </p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">Optional target.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button type="button" variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="size-4" />
                Reset to defaults
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ------------------------------- RESULTS ------------------------------- */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div className="space-y-1.5">
              <CardTitle className="flex items-center gap-2">
                <Scale className="size-4 text-primary" />
                Illustrative results
              </CardTitle>
              <CardDescription>
                {pair.label} · {direction}
              </CardDescription>
            </div>
            <DemoDataTag />
          </CardHeader>
          <CardContent className="space-y-4">
            {result ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <StatTile
                    label="Risk amount"
                    value={formatCurrency(result.riskAmount)}
                    icon={Coins}
                    tone="negative"
                    hint={`${risk}% of balance`}
                  />
                  <StatTile
                    label="Stop distance"
                    value={`${result.stopDistancePips.toFixed(1)} pips`}
                    icon={Ruler}
                    hint="Entry → stop-loss"
                  />
                  <StatTile
                    label="Potential reward"
                    value={
                      result.potentialReward !== null
                        ? formatCurrency(result.potentialReward)
                        : "—"
                    }
                    icon={Target}
                    tone={result.potentialReward !== null ? "positive" : "default"}
                    hint={
                      result.rewardDistancePips !== null
                        ? `${result.rewardDistancePips.toFixed(1)} pips to target`
                        : "No take-profit set"
                    }
                  />
                  <StatTile
                    label="Position size"
                    value={`${result.positionSizeLots.toFixed(2)} lots`}
                    icon={Layers}
                    tone="primary"
                    hint={`${formatCompact(result.positionSizeUnits)} units`}
                  />
                </div>

                {/* Risk / reward */}
                {result.riskReward !== null &&
                result.rewardDistancePips !== null ? (
                  <RiskRewardCard
                    riskReward={result.riskReward}
                    riskPips={Math.round(result.stopDistancePips)}
                    rewardPips={Math.round(result.rewardDistancePips)}
                  />
                ) : (
                  <div className="rounded-lg border border-border bg-surface p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        Risk / Reward
                      </span>
                      <span className="text-sm font-semibold tabular-nums text-muted-foreground">
                        —
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Add a take-profit to see the risk/reward ratio.
                    </p>
                  </div>
                )}

                {/* Price ladder (needs a valid target) */}
                {hasTarget && target !== null && entry !== null && stop !== null && (
                  <div className="rounded-lg bg-surface p-3">
                    <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 text-negative">Stop</span>
                      <span>Entry</span>
                      <span className="flex items-center gap-1 text-positive">Target</span>
                    </div>
                    <PriceLadder
                      direction={direction}
                      entry={entry}
                      stopLoss={stop}
                      takeProfit={target}
                      decimals={pair.decimals}
                    />
                    <div className="mt-2 flex items-center justify-between text-[11px] tabular-nums text-muted-foreground">
                      <span>{formatPrice(stop, pair.decimals)}</span>
                      <span>{formatPrice(entry, pair.decimals)}</span>
                      <span>{formatPrice(target, pair.decimals)}</span>
                    </div>
                  </div>
                )}

                {/* Pip value note */}
                <div className="flex items-center justify-between rounded-lg bg-surface px-3 py-2.5 text-xs">
                  <span className="text-muted-foreground">Pip value / standard lot</span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {formatCurrency(result.pipValuePerLot)}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Approximation assumes a USD account and a standard 100,000-unit lot
                  (100 units for metals). Your broker&apos;s actual pip value and contract
                  size may differ.
                </p>
              </>
            ) : (
              <div className="flex min-h-[260px] flex-col items-center justify-center rounded-lg bg-surface p-6 text-center">
                <Calculator className="size-8 text-muted-foreground/60" />
                <p className="mt-3 text-sm font-medium text-foreground">
                  Results unavailable
                </p>
                <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                  Fix the highlighted inputs — a valid balance, risk between {RISK_MIN}% and{" "}
                  {RISK_MAX}%, and entry / stop-loss levels on the correct side for a{" "}
                  {direction.toLowerCase()} — to see your illustrative position size.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
