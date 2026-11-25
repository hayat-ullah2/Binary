import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { AuroraBackground } from "@/components/shared/aurora-background";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "SHARP PRO BOT — Forex Trading Signals",
    template: "%s · SHARP PRO BOT",
  },
  description:
    "SHARP PRO BOT is a premium Forex trading-signals platform with live market data and analytics.",
  applicationName: "SHARP PRO BOT",
  icons: {
    icon: "/sharp-pro-bot.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background" suppressHydrationWarning>
        <AuroraBackground />
        <div className="relative z-10">
          <AppShell>{children}</AppShell>
        </div>
      </body>
    </html>
  );
}
