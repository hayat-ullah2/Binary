"use client";

import { useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  Rows3,
  LayoutGrid,
  StarOff,
  ListPlus,
  RotateCcw,
  SearchX,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchInput } from "@/components/shared/filter-toolbar";
import { CurrencyPairBadge } from "@/components/shared/currency-pair-badge";
import { Sparkline } from "@/components/shared/sparkline";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { LiveBadge } from "@/components/shared/live-badge";
import { useQuotes } from "@/lib/hooks/use-quotes";
import { useWatchlist } from "@/lib/hooks/use-watchlist";
import { TableRowSkeleton, CardListSkeleton } from "@/components/shared/loading-skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatPrice, formatPercent } from "@/lib/utils";
import {
  CURRENCY_PAIRS,
  getPair,
  MARKET_SESSIONS,
  sessionIsOpen,
  MARKET_NOW,
} from "@/lib/mock-data";
import type { CurrencyPair, Quote } from "@/types/forex";

type ViewMode = "table" | "grid";

interface WatchRow {
  symbol: string;
  pair: CurrencyPair;
  quote: Quote;
}

/** Signed price string using the instrument's own decimal precision. */
function signedPrice(value: number, decimals: number): string {
  const formatted = formatPrice(Math.abs(value), decimals);
  return `${value >= 0 ? "+" : "−"}${formatted}`;
}

export default function WatchlistPage() {
  // ── State ──────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewMode>("table");

  // Add-pair dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addSearch, setAddSearch] = useState("");

  // Remove confirmation
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);

  // Watchlist membership persisted in Neon; live quotes from Twelve Data.
  const {
    symbols: watched,
    add: addPair,
    remove: removePair,
    restore,
    loading,
  } = useWatchlist();
  const { map: quoteMap, source } = useQuotes();

  // ── Derived market status (deterministic from fixed MARKET_NOW) ──────────
  const marketOpen = useMemo(() => {
    const hour = new Date(MARKET_NOW).getUTCHours();
    return MARKET_SESSIONS.some((s) => sessionIsOpen(s, hour));
  }, []);

  // ── Rows for the watched symbols ─────────────────────────────────────────
  const rows = useMemo<WatchRow[]>(
    () =>
      watched
        .map((symbol) => {
          const quote = quoteMap[symbol];
          if (!quote) return null;
          return { symbol, pair: getPair(symbol), quote };
        })
        .filter((r): r is WatchRow => r !== null),
    [watched, quoteMap]
  );

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      `${r.symbol} ${r.pair.label} ${r.pair.base} ${r.pair.quote}`
        .toLowerCase()
        .includes(q)
    );
  }, [rows, search]);

  // Pairs available to add (not already watched)
  const availablePairs = useMemo(
    () => CURRENCY_PAIRS.filter((p) => !watched.includes(p.symbol)),
    [watched]
  );

  const filteredAvailable = useMemo(() => {
    const q = addSearch.trim().toLowerCase();
    if (!q) return availablePairs;
    return availablePairs.filter((p) =>
      `${p.symbol} ${p.label} ${p.base} ${p.quote}`.toLowerCase().includes(q)
    );
  }, [availablePairs, addSearch]);

  // ── Actions (persisted via the useWatchlist hook) ────────────────────────
  const confirmRemove = () => {
    if (removeTarget) removePair(removeTarget);
    setRemoveTarget(null);
  };

  const restoreDefaults = () => {
    restore();
    setSearch("");
  };

  const removePairLabel = removeTarget ? getPair(removeTarget).label : "";
  const marketBadge = marketOpen ? (
    <Badge variant="positive" className="gap-1.5">
      <span className="size-1.5 rounded-full bg-positive" />
      Open
    </Badge>
  ) : (
    <Badge variant="secondary" className="gap-1.5">
      <span className="size-1.5 rounded-full bg-muted-foreground" />
      Closed
    </Badge>
  );

  const isEmpty = rows.length === 0;
  const noMatches = !isEmpty && filteredRows.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Watchlist"
        description="Your tracked currency pairs and gold. Live prices are provided by Twelve Data (lightly delayed), with a sample-data fallback."
        actions={
          <>
            <LiveBadge source={source} />
            <ViewToggle value={view} onChange={setView} />
            <Badge variant="secondary" className="tabular-nums">
              {rows.length} tracked
            </Badge>
            <AddPairDialog
              open={addOpen}
              onOpenChange={(o) => {
                setAddOpen(o);
                if (!o) setAddSearch("");
              }}
              available={filteredAvailable}
              totalAvailable={availablePairs.length}
              search={addSearch}
              onSearchChange={setAddSearch}
              onAdd={addPair}
            />
          </>
        }
      />

      {/* Filter the visible rows */}
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Filter watchlist…"
        className="lg:w-72"
      />

      {/* ── Content ───────────────────────────────────────────────────────── */}
      {loading ? (
        <>
          {/* Desktop skeleton */}
          <Card className="hidden md:block">
            <CardContent className="p-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <TableRowSkeleton key={i} columns={7} />
              ))}
            </CardContent>
          </Card>
          {/* Mobile skeleton */}
          <div className="md:hidden">
            <CardListSkeleton count={5} />
          </div>
        </>
      ) : isEmpty ? (
        <EmptyState
          icon={StarOff}
          title="Your watchlist is empty"
          description="You've removed every pair. Restore the default set to start tracking quotes again, or add individual pairs."
          action={
            <Button variant="outline" size="sm" onClick={restoreDefaults}>
              <RotateCcw className="size-4" />
              Restore defaults
            </Button>
          }
        />
      ) : noMatches ? (
        <EmptyState
          icon={SearchX}
          title="No pairs match your search"
          description="No tracked pair matches that term. Try a different pair name or clear the search."
          action={
            <Button variant="outline" size="sm" onClick={() => setSearch("")}>
              Clear search
            </Button>
          }
        />
      ) : (
        <>
          {/* ── Desktop: table or grid ─────────────────────────────────── */}
          <div className="hidden md:block">
            {view === "table" ? (
              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <div className="min-w-0">
                    <CardTitle>Tracked pairs</CardTitle>
                    <CardDescription>
                      Sample quotes · {filteredRows.length} shown
                    </CardDescription>
                  </div>
                  {marketBadge}
                </CardHeader>
                <CardContent className="px-0 pb-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Pair</TableHead>
                        <TableHead className="text-right">Bid</TableHead>
                        <TableHead className="text-right">Ask</TableHead>
                        <TableHead className="text-right">Spread</TableHead>
                        <TableHead className="text-right">Daily change</TableHead>
                        <TableHead className="text-right">Trend</TableHead>
                        <TableHead className="w-10 text-right">
                          <span className="sr-only">Actions</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRows.map((r) => {
                        const up = r.quote.dayChangePercent >= 0;
                        return (
                          <TableRow key={r.symbol}>
                            <TableCell>
                              <CurrencyPairBadge symbol={r.symbol} size="sm" />
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatPrice(r.quote.bid, r.pair.decimals)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatPrice(r.quote.ask, r.pair.decimals)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">
                              {r.quote.spread.toFixed(1)}
                              <span className="ml-1 text-xs">pips</span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex flex-col items-end leading-tight">
                                <span
                                  className={cn(
                                    "tabular-nums text-sm font-medium",
                                    up ? "text-positive" : "text-negative"
                                  )}
                                >
                                  {signedPrice(r.quote.dayChange, r.pair.decimals)}
                                </span>
                                <Badge
                                  variant={up ? "positive" : "negative"}
                                  className="mt-0.5 tabular-nums"
                                >
                                  {formatPercent(r.quote.dayChangePercent)}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end">
                                <Sparkline data={r.quote.sparkline} positive={up} />
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Remove ${r.pair.label} from watchlist`}
                                className="text-muted-foreground hover:text-negative"
                                onClick={() => setRemoveTarget(r.symbol)}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                {filteredRows.map((r) => (
                  <WatchCard
                    key={r.symbol}
                    row={r}
                    marketBadge={marketBadge}
                    onRemove={() => setRemoveTarget(r.symbol)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Mobile: always stacked cards ───────────────────────────── */}
          <div className="space-y-3 md:hidden">
            {filteredRows.map((r) => (
              <WatchCard
                key={r.symbol}
                row={r}
                marketBadge={marketBadge}
                onRemove={() => setRemoveTarget(r.symbol)}
              />
            ))}
          </div>
        </>
      )}

      <ConfirmationDialog
        open={removeTarget !== null}
        onOpenChange={(o) => {
          if (!o) setRemoveTarget(null);
        }}
        title={`Remove ${removePairLabel}?`}
        description={`${removePairLabel} will be taken off your watchlist. You can add it back at any time from “Add pair”.`}
        confirmLabel="Remove"
        cancelLabel="Keep"
        destructive
        onConfirm={confirmRemove}
      />
    </div>
  );
}

/* ───────────────────────────── Sub-components ───────────────────────────── */

function ViewToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  const options: { value: ViewMode; label: string; icon: typeof Rows3 }[] = [
    { value: "table", label: "Table", icon: Rows3 },
    { value: "grid", label: "Grid", icon: LayoutGrid },
  ];
  return (
    <div
      role="group"
      aria-label="View mode"
      className="hidden items-center gap-1 rounded-md border border-border bg-surface p-1 md:inline-flex"
    >
      {options.map((o) => {
        const Icon = o.icon;
        const active = value === o.value;
        return (
          <Button
            key={o.value}
            type="button"
            variant={active ? "secondary" : "ghost"}
            size="sm"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cn("h-7 px-2.5", !active && "text-muted-foreground")}
          >
            <Icon className="size-4" />
            {o.label}
          </Button>
        );
      })}
    </div>
  );
}

function AddPairDialog({
  open,
  onOpenChange,
  available,
  totalAvailable,
  search,
  onSearchChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  available: CurrencyPair[];
  totalAvailable: number;
  search: string;
  onSearchChange: (v: string) => void;
  onAdd: (symbol: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={totalAvailable === 0}>
          <Plus className="size-4" />
          Add pair
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a pair</DialogTitle>
          <DialogDescription>
            Search the pairs not already on your watchlist and tap to add.
          </DialogDescription>
        </DialogHeader>

        <SearchInput
          value={search}
          onChange={onSearchChange}
          placeholder="Search pairs…"
          className="w-full lg:w-full"
        />

        <div className="max-h-72 space-y-1 overflow-y-auto">
          {totalAvailable === 0 ? (
            <div className="rounded-lg bg-surface px-4 py-8 text-center text-sm text-muted-foreground">
              Every available pair is already on your watchlist.
            </div>
          ) : available.length === 0 ? (
            <div className="rounded-lg bg-surface px-4 py-8 text-center text-sm text-muted-foreground">
              No available pair matches “{search}”.
            </div>
          ) : (
            available.map((p) => (
              <button
                key={p.symbol}
                type="button"
                onClick={() => onAdd(p.symbol)}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-transparent bg-surface px-3 py-2 text-left transition-colors hover:border-border hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                <CurrencyPairBadge symbol={p.symbol} size="sm" showCategory />
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-muted text-primary">
                  <ListPlus className="size-4" />
                </span>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WatchCard({
  row,
  marketBadge,
  onRemove,
}: {
  row: WatchRow;
  marketBadge: React.ReactNode;
  onRemove: () => void;
}) {
  const up = row.quote.dayChangePercent >= 0;
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <CurrencyPairBadge symbol={row.symbol} size="sm" showCategory />
          <div className="flex items-center gap-1.5">
            {marketBadge}
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove ${row.pair.label} from watchlist`}
              className="text-muted-foreground hover:text-negative"
              onClick={onRemove}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="leading-tight">
            <p className="text-lg font-semibold tabular-nums text-foreground">
              {formatPrice(row.quote.bid, row.pair.decimals)}
            </p>
            <Badge
              variant={up ? "positive" : "negative"}
              className="mt-1 tabular-nums"
            >
              {formatPercent(row.quote.dayChangePercent)}
            </Badge>
          </div>
          <Sparkline data={row.quote.sparkline} positive={up} width={88} height={36} />
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-lg bg-surface p-2.5 text-center">
          <Stat label="Bid" value={formatPrice(row.quote.bid, row.pair.decimals)} />
          <Stat label="Ask" value={formatPrice(row.quote.ask, row.pair.decimals)} />
          <Stat label="Spread" value={`${row.quote.spread.toFixed(1)}`} suffix="pips" />
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="tabular-nums text-sm font-medium text-foreground">
        {value}
        {suffix && (
          <span className="ml-1 text-xs text-muted-foreground">{suffix}</span>
        )}
      </p>
    </div>
  );
}
