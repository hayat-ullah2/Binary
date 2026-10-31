/**
 * Route-transition skeleton. Renders instantly inside the persistent AppShell
 * while a page's client bundle/data resolves — replaces blank/full-screen
 * spinners with a structured placeholder (Server Component, zero JS).
 */
export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-7 w-52 max-w-full animate-pulse rounded-md bg-muted/50" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded bg-muted/40" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-xl border border-border/60 bg-card/60"
          />
        ))}
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="h-80 animate-pulse rounded-xl border border-border/60 bg-card/60 lg:col-span-2" />
        <div className="h-80 animate-pulse rounded-xl border border-border/60 bg-card/60" />
      </div>
    </div>
  );
}
