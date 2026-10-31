"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn, formatSigned } from "@/lib/utils";
import type { PerformancePoint } from "@/types/forex";

const AXIS = {
  tick: { fill: "var(--muted-foreground)", fontSize: 11 },
  axisLine: false as const,
  tickLine: false as const,
};

/** Shared styling so every tooltip matches the popover surface. */
const TOOLTIP_STYLE = {
  contentStyle: {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    fontSize: 12,
    boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
    padding: "8px 10px",
  },
  labelStyle: { color: "var(--muted-foreground)", marginBottom: 4, fontSize: 11 },
  itemStyle: { color: "var(--foreground)", padding: 0 },
} as const;

const pipsFormatter = (value: unknown): [string, string] => [
  `${formatSigned(Number(value), 1)} pips`,
  "",
];

/** Cumulative pips area — the headline performance curve. */
export function CumulativePipsChart({
  data,
  height = 260,
  className,
}: {
  data: PerformancePoint[];
  height?: number;
  className?: string;
}) {
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id="cum-pips" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" {...AXIS} minTickGap={24} />
          <YAxis {...AXIS} width={48} />
          <Tooltip {...TOOLTIP_STYLE} formatter={pipsFormatter} />
          <Area
            type="monotone"
            dataKey="cumulativePips"
            name="Cumulative pips"
            stroke="var(--primary)"
            strokeWidth={2}
            fill="url(#cum-pips)"
            dot={false}
            activeDot={{ r: 3.5, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Per-period pips as bars, colored by sign. */
export function PerformanceChart({
  data,
  height = 260,
  className,
}: {
  data: PerformancePoint[];
  height?: number;
  className?: string;
}) {
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" {...AXIS} minTickGap={16} />
          <YAxis {...AXIS} width={48} />
          <Tooltip
            {...TOOLTIP_STYLE}
            cursor={{ fill: "var(--muted)", opacity: 0.4 }}
            formatter={pipsFormatter}
          />
          <Bar dataKey="pips" name="Net pips" radius={[3, 3, 0, 0]} maxBarSize={28}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.pips >= 0 ? "var(--positive)" : "var(--negative)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Wins vs losses as stacked bars per period. */
export function WinLossChart({
  data,
  height = 260,
  className,
}: {
  data: PerformancePoint[];
  height?: number;
  className?: string;
}) {
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" {...AXIS} minTickGap={16} />
          <YAxis {...AXIS} width={36} allowDecimals={false} />
          <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }}
          />
          <Bar dataKey="wins" stackId="a" name="Wins" fill="var(--positive)" maxBarSize={28} />
          <Bar dataKey="losses" stackId="a" name="Losses" fill="var(--negative)" radius={[3, 3, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Donut for a single ratio (e.g. win rate). */
export function RatioDonut({
  value,
  label,
  height = 200,
  tone = "var(--positive)",
}: {
  value: number;
  label: string;
  height?: number;
  tone?: string;
}) {
  const data = [
    { name: label, value },
    { name: "Rest", value: 100 - value },
  ];
  return (
    <div className="relative w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius="70%"
            outerRadius="100%"
            startAngle={90}
            endAngle={-270}
            stroke="none"
            paddingAngle={0}
          >
            <Cell fill={tone} />
            <Cell fill="var(--muted)" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold tabular-nums text-foreground">
          {value}%
        </span>
        <span className="text-[11px] text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

/** Generic horizontal bar list, e.g. pips by currency pair. */
export function HorizontalPipsChart({
  data,
  height = 280,
  className,
}: {
  data: Array<{ label: string; pips: number }>;
  height?: number;
  className?: string;
}) {
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
          <XAxis type="number" {...AXIS} />
          <YAxis type="category" dataKey="label" {...AXIS} width={72} />
          <Tooltip
            {...TOOLTIP_STYLE}
            cursor={{ fill: "var(--muted)", opacity: 0.4 }}
            formatter={pipsFormatter}
          />
          <Bar dataKey="pips" name="Net pips" radius={[0, 3, 3, 0]} maxBarSize={22}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.pips >= 0 ? "var(--positive)" : "var(--negative)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
