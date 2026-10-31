import { cn } from "@/lib/utils";

/**
 * Lightweight inline sparkline (pure SVG, no chart lib) for dense table rows.
 */
export function Sparkline({
  data,
  width = 96,
  height = 32,
  positive,
  className,
}: {
  data: number[];
  width?: number;
  height?: number;
  /** Force tone; otherwise inferred from first vs last value. */
  positive?: boolean;
  className?: string;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const pad = 2;
  const h = height - pad * 2;

  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = pad + h - ((v - min) / range) * h;
    return [x, y] as const;
  });

  const path = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");

  const up = positive ?? data[data.length - 1] >= data[0];
  const color = up ? "var(--positive)" : "var(--negative)";
  const areaPath = `${path} L${width},${height} L0,${height} Z`;
  const gradId = `spark-${up ? "up" : "dn"}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("overflow-visible", className)}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
