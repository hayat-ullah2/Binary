"use client";

import { useEffect, useRef } from "react";

/**
 * TradingView Advanced Chart widget (free embed). Loads TradingView's own live
 * market data — real charts, not app data — with full indicators and tools.
 * Client-only: the script is injected after mount, so SSR renders an empty box.
 */
export function TradingViewChart({
  symbol,
  interval = "60",
}: {
  symbol: string;
  interval?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const theme =
      document.documentElement.getAttribute("data-theme") === "light"
        ? "light"
        : "dark";

    container.innerHTML = "";
    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    widget.style.height = "100%";
    widget.style.width = "100%";
    container.appendChild(widget);

    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol,
      interval,
      timezone: "Etc/UTC",
      theme,
      style: "1",
      locale: "en",
      autosize: true,
      allow_symbol_change: true,
      hide_side_toolbar: false,
      support_host: "https://www.tradingview.com",
    });
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [symbol, interval]);

  return (
    <div ref={containerRef} className="tradingview-widget-container h-full w-full" />
  );
}
