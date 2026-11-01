"use client";

import { useEffect, useRef } from "react";

/** App pair symbol → TradingView symbol (gold uses OANDA's spot feed). */
const TV_SYMBOLS: Record<string, string> = {
  EURUSD: "FX:EURUSD",
  GBPUSD: "FX:GBPUSD",
  USDJPY: "FX:USDJPY",
  XAUUSD: "OANDA:XAUUSD",
  AUDUSD: "FX:AUDUSD",
  USDCHF: "FX:USDCHF",
  USDCAD: "FX:USDCAD",
  NZDUSD: "FX:NZDUSD",
  EURJPY: "FX:EURJPY",
  GBPJPY: "FX:GBPJPY",
  EURGBP: "FX:EURGBP",
};

export function toTradingViewSymbol(pair: string): string {
  return TV_SYMBOLS[pair] ?? `FX:${pair}`;
}

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
    // On phones the left drawing toolbar eats the (already narrow) chart width —
    // hide it so the candles get the full width.
    const isMobile = window.innerWidth < 768;

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
      hide_side_toolbar: isMobile,
      hide_legend: isMobile,
      hide_volume: isMobile,
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
