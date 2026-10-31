"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";
import { Logo } from "./logo";

export function MobileNavigation({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const pathname = usePathname();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideClose
        className="left-0 top-0 h-full max-w-[280px] translate-x-0 translate-y-0 gap-0 rounded-none rounded-r-xl border-l-0 p-0 data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-[280px]"
      >
        <VisuallyHidden>
          <DialogTitle>Navigation menu</DialogTitle>
        </VisuallyHidden>
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <Logo />
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close menu"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onOpenChange(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary-muted text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="size-[18px] shrink-0" />
                <div className="flex flex-col leading-tight">
                  <span>{item.label}</span>
                  <span className="text-[11px] font-normal text-muted-foreground">
                    {item.description}
                  </span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-3">
          <div className="flex items-start gap-2 rounded-lg bg-primary-muted/40 p-3">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              All prices and signals shown are illustrative sample data.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
