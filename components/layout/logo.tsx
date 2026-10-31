import { cn } from "@/lib/utils";
import Image from "next/image";

export function Logo({
  collapsed = false,
  className,
}: {
  collapsed?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Image
        src="/sharp-x-rebel.svg"
        alt=""
        width={32}
        height={32}
        aria-hidden="true"
        className="size-8 shrink-0 rounded-lg shadow-sm"
      />
      {!collapsed && (
        <span className="flex flex-col leading-none">
          <span className="bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-[15px] font-extrabold tracking-[-0.01em] text-transparent">
            SHARP X
          </span>
          <span className="mt-[3px] text-[9px] font-semibold uppercase tracking-[0.34em] text-primary/80">
            Rebel
          </span>
        </span>
      )}
    </div>
  );
}
