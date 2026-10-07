import { Skeleton } from "@/components/ui/skeleton";

export function HeaderSkeleton({ action = true }: { action?: boolean }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-2">
        <Skeleton className="h-9 w-56 rounded-xl sm:w-72" />
        <Skeleton className="h-4 w-64 max-w-full rounded-lg" />
      </div>
      {action ? <Skeleton className="h-10 w-40 rounded-xl" /> : null}
    </div>
  );
}

export function RowsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="divide-y overflow-hidden rounded-2xl border bg-card">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-4">
          <Skeleton className="h-4 w-1/4 rounded-lg" />
          <Skeleton className="hidden h-4 w-1/4 rounded-lg sm:block" />
          <Skeleton className="ml-auto h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function PanelSkeleton({ className = "h-64" }: { className?: string }) {
  return <Skeleton className={`w-full rounded-2xl ${className}`} />;
}
