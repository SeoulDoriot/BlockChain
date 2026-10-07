import { HeaderSkeleton, PanelSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="max-w-3xl space-y-6" aria-busy="true">
      <HeaderSkeleton action={false} />
      <PanelSkeleton className="h-52" />
      <PanelSkeleton className="h-44" />
      <PanelSkeleton className="h-36" />
    </div>
  );
}
