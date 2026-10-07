import { HeaderSkeleton, PanelSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true">
      <HeaderSkeleton action={false} />
      <div className="grid gap-6 lg:grid-cols-2">
        <PanelSkeleton className="h-40" />
        <PanelSkeleton className="h-40" />
      </div>
      <PanelSkeleton className="h-48" />
    </div>
  );
}
