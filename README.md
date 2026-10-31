# SHARP X REBEL — Forex Trading Signals (UI Prototype)

A premium Forex trading-signals interface built with Next.js, TypeScript, and Tailwind CSS. The dashboard uses illustrative sample data; account registration and access approvals are backed by PostgreSQL.

> **Demonstration data.** Every price, signal, and statistic in the app is illustrative sample data for design preview only.

## Tech stack

- **Next.js 16** (App Router) + **React 19**
- **TypeScript** (strict)
- **Tailwind CSS v4** design-token system (dark navy terminal theme, emerald/rose semantics)
- **shadcn-style** UI primitives on **Radix UI**
- **Recharts** for charts, **Lucide** icons, **Framer Motion** available, **React Hook Form** available

## Getting started

```bash
npm install
Copy-Item .env.example .env  # PowerShell; then set your database and auth values
npm run db:push
npm run dev     # http://localhost:3000
```

Other scripts:

```bash
npm run build   # production build
npm start       # serve the production build
npm run lint    # ESLint
npx tsc --noEmit  # type check
```

## Authentication and account approval

- Set `BETTER_AUTH_SECRET` to a unique random secret of at least 32 characters and `BETTER_AUTH_URL` to the app's origin in `.env`.
- Run `npm run db:push` to create the Better Auth user, session, account, and verification tables in the configured PostgreSQL database.
- Registration and email/password login use Better Auth. After registering, users submit their Quotex Account ID / UID; the admin reviews it from **Admin → Users** and approves dashboard access. Approval is monitored automatically while the user is waiting.
- Only the Quotex Account ID / UID is requested. Never collect Quotex passwords, OTPs, or SID values. Approval is a manual admin review; it does not verify identities with Quotex.
- Admin access requires configured `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` values; the app does not use built-in fallback credentials. Use strong, unique values in production.
- Email verification and Telegram authentication are not enabled. The Telegram link opens the group invite, and the account-access screen's **Open Quotex** button opens `https://quotex.com/sign-up/?lid=881991`.

## Routes

| Route | Page | Highlights |
| --- | --- | --- |
| `/` | Dashboard | Welcome header, market-session indicator, summary stats, market overview, price chart with timeframe selector, recent signals, activity feed |
| `/signals` | Live Signals | Searchable/filterable signals (table + card views), filters (pair/direction/timeframe/status), detail dialog, empty state |
| `/history` | Signal History | Closed sample signals, date/pair/direction/outcome filters, win-rate & P/L charts, results table |
| `/analytics` | Analytics | Win-rate & R/R charts, daily/weekly performance, pair breakdown, BUY vs SELL, timeframe analysis |
| `/watchlist` | Watchlist | Sample bid/ask/spread/change, sparklines, add/remove with confirmation, loading & empty states |
| `/risk-calculator` | Risk Calculator | Live position-sizing math, validation, risk/reward visualization |
| `/settings` | Settings | Profile, theme & display, notifications, trading preferences (local demo only) |
| `/admin/users` | User approvals | Review registrations and approve or reject dashboard access |

## Project structure

```
app/                     # App Router pages (one folder per route)
components/
  layout/                # AppShell, AppSidebar, TopNavbar, MobileNavigation, PageHeader
  ui/                    # Reusable primitives (button, card, select, dialog, …)
  shared/                # Domain components (StatCard, SignalsTable, PriceChart, charts, …)
  dashboard/             # Dashboard-specific sections
lib/
  mock-data.ts           # Typed, deterministic demonstration data
  calculations.ts        # Risk-calculator math
  utils.ts               # cn() + formatting helpers
types/forex.ts           # Domain types
```

## Design system

Colors, spacing, radius, and typography are defined as CSS custom properties in `app/globals.css` and exposed to Tailwind via `@theme`. The app is dark by default; the Settings page includes a demo light-theme toggle (`:root[data-theme="light"]`). All numeric data uses tabular figures.

## Scope & limitations

- No backend, database, authentication, payments, or live prices — by design for this phase.
- Data is deterministic sample data (seeded) so charts render identically on server and client.
- Relative timestamps are measured against a fixed demo "now" for stable rendering.
