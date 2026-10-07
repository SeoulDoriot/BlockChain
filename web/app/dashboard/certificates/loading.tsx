import { HeaderSkeleton, RowsSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true">
      <HeaderSkeleton />
      <Skeleton className="h-10 w-full rounded-xl" />
      <RowsSkeleton rows={8} />
    </div>
  );
}
