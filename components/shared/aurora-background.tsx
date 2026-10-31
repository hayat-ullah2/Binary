/**
 * Fixed, full-viewport animated gradient ("aurora") that sits behind the app.
 * Pure CSS (see globals.css) — slowly drifting colored glows over the dark base.
 * Decorative only; non-interactive and hidden from assistive tech.
 */
export function AuroraBackground() {
  return (
    <div className="aurora-bg" aria-hidden="true">
      <span className="aurora-blob aurora-blob-1" />
      <span className="aurora-blob aurora-blob-2" />
      <span className="aurora-blob aurora-blob-3" />
      <span className="aurora-blob aurora-blob-4" />
    </div>
  );
}
