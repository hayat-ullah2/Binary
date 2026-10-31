"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeft, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";
import { Logo } from "./logo";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function AppSidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();

  return (
    <TooltipProvider delayDuration={100}>
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-border bg-surface transition-[width] duration-200 ease-out",
          collapsed ? "w-[72px]" : "w-64"
        )}
      >
        <div
          className={cn(
            "flex h-16 items-center border-b border-border px-4",
            collapsed ? "justify-center" : "justify-between"
          )}
        >
          <Link href="/" aria-label="SHARP X REBEL home">
            <Logo collapsed={collapsed} />
          </Link>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV_ITEMS.map((item, idx) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const firstAdmin = item.admin && !NAV_ITEMS[idx - 1]?.admin;
            const link = (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  collapsed && "justify-center px-0",
                  active
                    ? "bg-primary-muted text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-primary" />
                )}
                <item.icon className="size-[18px] shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );

            const wrapped = collapsed ? (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            ) : (
              link
            );

            return (
              <div key={item.href}>
                {firstAdmin &&
                  (collapsed ? (
                    <div className="my-2 border-t border-border" />
                  ) : (
                    <p className="mb-1 mt-4 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                      Admin
                    </p>
                  ))}
                {wrapped}
              </div>
            );
          })}
        </nav>

        <div className="border-t border-border p-3">
          {!collapsed && (
            <div className="mb-3 flex items-start gap-2 rounded-lg bg-primary-muted/40 p-3">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                All prices and signals shown are illustrative sample data.
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={onToggle}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              collapsed && "justify-center px-0"
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeft className="size-[18px]" />
            ) : (
              <>
                <PanelLeftClose className="size-[18px]" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
