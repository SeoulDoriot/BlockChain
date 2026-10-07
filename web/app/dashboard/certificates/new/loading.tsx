import { HeaderSkeleton, PanelSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="space-y-8" aria-busy="true">
      <HeaderSkeleton action={false} />
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-5">
          <PanelSkeleton className="h-48" />
          <PanelSkeleton className="h-64" />
        </div>
        <PanelSkeleton className="aspect-[1.414/1] h-auto" />
      </div>
    </div>
  );
}
