import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function StatCardSkeleton() {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-20" />
        </div>
        <Skeleton className="size-10 rounded-lg" />
      </div>
      <Skeleton className="mt-3 h-4 w-28" />
    </Card>
  );
}

export function TableRowSkeleton({ columns = 6 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-4 border-b border-border px-3 py-3.5 last:border-0">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-4", i === 0 ? "w-32" : "w-full max-w-[90px]")}
        />
      ))}
    </div>
  );
}

export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-end gap-2">
        {[60, 85, 45, 70, 95, 55, 80, 65, 90, 50, 75, 68].map((h, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-sm"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <Skeleton className="h-3 w-full" />
    </div>
  );
}

export function CardListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-8 w-16 rounded-md" />
          </div>
        </Card>
      ))}
    </div>
  );
}
