import {
  LayoutDashboard,
  Radio,
  CandlestickChart,
  History,
  BarChart3,
  Eye,
  Calculator,
  Settings,
  Zap,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
  /** Marks admin-only items (grouped separately; will be auth-gated later). */
  admin?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, description: "Market overview & summary" },
  { label: "Live Signals", href: "/signals", icon: Radio, description: "Active trading signals" },
  { label: "Live Chart", href: "/live-chart", icon: CandlestickChart, description: "TradingView charts" },
  { label: "Signal History", href: "/history", icon: History, description: "Closed signal results" },
  { label: "Analytics", href: "/analytics", icon: BarChart3, description: "Performance breakdowns" },
  { label: "Watchlist", href: "/watchlist", icon: Eye, description: "Tracked currency pairs" },
  { label: "Risk Calculator", href: "/risk-calculator", icon: Calculator, description: "Position sizing tool" },
  { label: "Quick Signals", href: "/quick-signals", icon: Zap, description: "Timed BUY/SELL calls" },
  { label: "Settings", href: "/settings", icon: Settings, description: "Preferences & display" },
];
