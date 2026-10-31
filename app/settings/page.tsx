"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  User,
  Palette,
  Bell,
  LineChart,
  Check,
  RotateCcw,
  Save,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { authClient } from "@/lib/auth-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CURRENCY_PAIRS, DEFAULT_WATCHLIST, TIMEFRAMES } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { Timeframe } from "@/types/forex";

type ThemePref = "dark" | "light" | "system";

type SettingsState = {
  // Profile
  fullName: string;
  email: string;
  timezone: string;
  bio: string;
  // Theme & display
  theme: ThemePref;
  compact: boolean;
  demoLabels: boolean;
  // Notifications
  notifNewSignals: boolean;
  notifTargetHit: boolean;
  notifStopHit: boolean;
  notifDailySummary: boolean;
  notifEmail: boolean;
  notifPush: boolean;
  // Trading
  defaultTimeframe: Timeframe;
  watchlist: string[];
  riskPercent: number;
  accountCurrency: string;
};

const INITIAL: SettingsState = {
  fullName: "Alex Morgan",
  email: "apps@metavizai.com",
  timezone: "UTC",
  bio: "Discretionary FX swing trader following London and New York sessions.",
  theme: "dark",
  compact: false,
  demoLabels: true,
  notifNewSignals: true,
  notifTargetHit: true,
  notifStopHit: true,
  notifDailySummary: false,
  notifEmail: true,
  notifPush: false,
  defaultTimeframe: "H1",
  watchlist: [...DEFAULT_WATCHLIST],
  riskPercent: 1,
  accountCurrency: "USD",
};

const TIMEZONES = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Berlin", label: "Frankfurt (CET)" },
  { value: "America/New_York", label: "New York (ET)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
];

const CURRENCIES = [
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — British Pound" },
];

const THEME_OPTIONS: { value: ThemePref; label: string; icon: typeof Sun }[] = [
  { value: "dark", label: "Dark", icon: Moon },
  { value: "light", label: "Light", icon: Sun },
  { value: "system", label: "System", icon: Monitor },
];

function applyTheme(theme: ThemePref) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "light") root.setAttribute("data-theme", "light");
  else if (theme === "dark") root.setAttribute("data-theme", "dark");
  else root.removeAttribute("data-theme");
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "PP";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

/** A single label + helper-text + control row. */
function SwitchRow({
  id,
  label,
  helper,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  helper: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg bg-surface px-3.5 py-3">
      <div className="min-w-0 space-y-0.5">
        <Label htmlFor={id} className="cursor-pointer">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{helper}</p>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="mt-0.5"
      />
    </div>
  );
}

const textareaClasses =
  "flex min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50";

export default function SettingsPage() {
  const [working, setWorking] = useState<SettingsState>(INITIAL);
  const [saved, setSaved] = useState<SettingsState>(INITIAL);
  const [showSaved, setShowSaved] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { data: session } = authClient.useSession();
  const hydratedRef = useRef(false);

  // Seed the profile fields from the signed-in user (once, when available).
  useEffect(() => {
    const u = session?.user;
    if (hydratedRef.current || !u) return;
    hydratedRef.current = true;
    const name = u.name?.trim();
    setWorking((p) => ({ ...p, fullName: name || p.fullName, email: u.email || p.email }));
    setSaved((p) => ({ ...p, fullName: name || p.fullName, email: u.email || p.email }));
  }, [session]);

  // Apply current theme state to the document (on mount + whenever it changes).
  useEffect(() => {
    applyTheme(working.theme);
  }, [working.theme]);

  // Clear any pending confirmation timer on unmount.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const hasChanges = useMemo(
    () => JSON.stringify(working) !== JSON.stringify(saved),
    [working, saved]
  );

  function update<K extends keyof SettingsState>(key: K, value: SettingsState[K]) {
    setWorking((prev) => ({ ...prev, [key]: value }));
  }

  function handleThemeChange(next: ThemePref) {
    update("theme", next);
    applyTheme(next); // apply immediately from the change handler
  }

  function toggleWatchlist(symbol: string, checked: boolean) {
    setWorking((prev) => ({
      ...prev,
      watchlist: checked
        ? [...prev.watchlist, symbol]
        : prev.watchlist.filter((s) => s !== symbol),
    }));
  }

  function handleSave() {
    setSaved(working);
    setShowSaved(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setShowSaved(false), 3000);
  }

  function handleCancel() {
    setWorking(saved);
    applyTheme(saved.theme);
    setShowSaved(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your profile, display, notification, and trading preferences."
      />

      <Tabs defaultValue="profile" className="space-y-5">
        <TabsList className="flex h-auto w-full flex-wrap justify-start sm:w-auto">
          <TabsTrigger value="profile">
            <User className="size-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="preferences">
            <Palette className="size-4" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="size-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="trading">
            <LineChart className="size-4" />
            Trading
          </TabsTrigger>
        </TabsList>

        {/* ---------- PROFILE ---------- */}
        <TabsContent value="profile" className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>
                Your display identity in the app. Sample details are prefilled
                for you.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center gap-4">
                <Avatar className="size-14">
                  <AvatarFallback className="text-base">
                    {initials(working.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {working.fullName || "Unnamed trader"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {working.email || "no-email@example.com"}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input
                    id="fullName"
                    value={working.fullName}
                    onChange={(e) => update("fullName", e.target.value)}
                    placeholder="Your name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={working.email}
                    onChange={(e) => update("email", e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={working.timezone}
                    onValueChange={(v) => update("timezone", v)}
                  >
                    <SelectTrigger id="timezone">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="bio">Short bio</Label>
                  <textarea
                    id="bio"
                    value={working.bio}
                    onChange={(e) => update("bio", e.target.value)}
                    placeholder="A sentence about your trading style."
                    className={textareaClasses}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------- PREFERENCES (theme & display) ---------- */}
        <TabsContent value="preferences" className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Theme & display</CardTitle>
              <CardDescription>
                Switch the app between dark, light, and system themes, and tune
                display density.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Theme preference</Label>
                <div
                  role="group"
                  aria-label="Theme preference"
                  className="inline-flex w-full flex-wrap gap-1 rounded-lg border border-border bg-surface p-1 sm:w-auto"
                >
                  {THEME_OPTIONS.map((opt) => {
                    const active = working.theme === opt.value;
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleThemeChange(opt.value)}
                        aria-pressed={active}
                        className={cn(
                          "inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors sm:flex-none",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          active
                            ? "bg-surface-elevated text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Icon className="size-4" />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  &ldquo;System&rdquo; follows your device setting (defaults to the
                  app&rsquo;s dark theme).
                </p>
              </div>

              <Separator />

              <div className="space-y-2.5">
                <SwitchRow
                  id="compact"
                  label="Compact density"
                  helper="Reduce padding and spacing to fit more on screen (display only)."
                  checked={working.compact}
                  onCheckedChange={(v) => update("compact", v)}
                />
                <SwitchRow
                  id="demoLabels"
                  label="Show sample-data labels"
                  helper="Display the sample-data badges on cards and tables (display only)."
                  checked={working.demoLabels}
                  onCheckedChange={(v) => update("demoLabels", v)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------- NOTIFICATIONS ---------- */}
        <TabsContent value="notifications" className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>
                Choose which signal and account events you would be alerted about.
                Display preferences only.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <SwitchRow
                id="notifNewSignals"
                label="New signals"
                helper="Notify me when a new trading signal is published."
                checked={working.notifNewSignals}
                onCheckedChange={(v) => update("notifNewSignals", v)}
              />
              <SwitchRow
                id="notifTargetHit"
                label="Target hit"
                helper="Alert me when a signal reaches its take-profit target."
                checked={working.notifTargetHit}
                onCheckedChange={(v) => update("notifTargetHit", v)}
              />
              <SwitchRow
                id="notifStopHit"
                label="Stop-loss hit"
                helper="Alert me when a signal reaches its stop-loss level."
                checked={working.notifStopHit}
                onCheckedChange={(v) => update("notifStopHit", v)}
              />
              <SwitchRow
                id="notifDailySummary"
                label="Daily summary"
                helper="Send a once-a-day recap of signal performance."
                checked={working.notifDailySummary}
                onCheckedChange={(v) => update("notifDailySummary", v)}
              />
              <Separator className="my-1" />
              <SwitchRow
                id="notifEmail"
                label="Email alerts"
                helper="Deliver selected notifications to your email address."
                checked={working.notifEmail}
                onCheckedChange={(v) => update("notifEmail", v)}
              />
              <SwitchRow
                id="notifPush"
                label="Push notifications"
                helper="Browser / mobile push delivery (display only — not wired)."
                checked={working.notifPush}
                onCheckedChange={(v) => update("notifPush", v)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------- TRADING ---------- */}
        <TabsContent value="trading" className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Trading preferences</CardTitle>
              <CardDescription>
                Defaults applied across the app. Risk fields are for display
                purposes only and place no real orders.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="defaultTimeframe">Default timeframe</Label>
                  <Select
                    value={working.defaultTimeframe}
                    onValueChange={(v) =>
                      update("defaultTimeframe", v as Timeframe)
                    }
                  >
                    <SelectTrigger id="defaultTimeframe">
                      <SelectValue placeholder="Select timeframe" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEFRAMES.map((tf) => (
                        <SelectItem key={tf} value={tf}>
                          {tf}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="accountCurrency">Account currency</Label>
                  <Select
                    value={working.accountCurrency}
                    onValueChange={(v) => update("accountCurrency", v)}
                  >
                    <SelectTrigger id="accountCurrency">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    For display purposes only.
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="riskPercent">Default risk percentage</Label>
                    <p className="text-xs text-muted-foreground">
                      For display purposes only — no orders are sized or placed.
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md bg-surface px-2 py-1 text-sm font-semibold tabular-nums text-foreground">
                    {working.riskPercent.toFixed(1)}%
                  </span>
                </div>
                <Slider
                  id="riskPercent"
                  value={[working.riskPercent]}
                  onValueChange={([n]) => update("riskPercent", n)}
                  min={0.1}
                  max={5}
                  step={0.1}
                  aria-label="Default risk percentage"
                />
                <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
                  <span>0.1%</span>
                  <span>5.0%</span>
                </div>
              </div>

              <Separator />

              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <Label>Default watchlist</Label>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {working.watchlist.length} selected
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Choose which pairs appear in your default watchlist.
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {CURRENCY_PAIRS.map((pair) => {
                    const checked = working.watchlist.includes(pair.symbol);
                    const cbId = `wl-${pair.symbol}`;
                    return (
                      <label
                        key={pair.symbol}
                        htmlFor={cbId}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                          checked
                            ? "border-primary/40 bg-primary-muted"
                            : "border-border bg-surface hover:border-border-strong"
                        )}
                      >
                        <Checkbox
                          id={cbId}
                          checked={checked}
                          onCheckedChange={(v) =>
                            toggleWatchlist(pair.symbol, v === true)
                          }
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium tabular-nums text-foreground">
                            {pair.symbol}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {pair.label} · {pair.category}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ---------- ACTION BAR ---------- */}
      <div className="sticky bottom-4 z-10">
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card/95 p-3.5 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-h-5 items-center gap-2 text-sm text-muted-foreground">
            {showSaved ? (
              <Badge variant="positive" className="gap-1">
                <Check className="size-3.5" />
                Preferences saved
              </Badge>
            ) : hasChanges ? (
              <span>You have unsaved changes.</span>
            ) : (
              <span>All changes saved.</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={!hasChanges}
            >
              <RotateCcw className="size-4" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!hasChanges}>
              <Save className="size-4" />
              Save changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
