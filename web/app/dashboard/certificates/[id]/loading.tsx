import { HeaderSkeleton, PanelSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="space-y-8" aria-busy="true">
      <HeaderSkeleton />
      <PanelSkeleton className="mx-auto aspect-[1.414/1] h-auto max-w-3xl" />
      <div className="grid gap-6 lg:grid-cols-2">
        <PanelSkeleton className="h-72" />
        <PanelSkeleton className="h-40" />
      </div>
    </div>
  );
}
