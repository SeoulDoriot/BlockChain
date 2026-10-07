import { HeaderSkeleton, PanelSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="space-y-8" aria-busy="true">
      <HeaderSkeleton action={false} />
      <PanelSkeleton className="aspect-[1.414/1] h-auto max-w-4xl" />
    </div>
  );
}
