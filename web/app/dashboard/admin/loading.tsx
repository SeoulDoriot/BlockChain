import { HeaderSkeleton, RowsSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true">
      <HeaderSkeleton action={false} />
      <RowsSkeleton rows={8} />
    </div>
  );
}
