import type { ResultKey } from "@/lib/status";
import { STATUS_LABELS } from "@/lib/status";
import { cn } from "@/lib/utils";

const TONE: Record<ResultKey, string> = {
  active: "bg-emerald-50 text-emerald-700 [--dot:#2f9e66]",
  expired: "bg-amber-50 text-amber-700 [--dot:#d9962b]",
  revoked: "bg-red-50 text-red-700 [--dot:#d4554a]",
  tampered: "bg-red-50 text-red-700 [--dot:#d4554a]",
  not_found: "bg-zinc-100 text-zinc-600 [--dot:#a1a1a6]",
  draft: "bg-zinc-100 text-zinc-600 [--dot:#a1a1a6]",
  unrecorded: "bg-amber-50 text-amber-700 [--dot:#d9962b]",
  unavailable: "bg-zinc-100 text-zinc-600 [--dot:#a1a1a6]",
};

/** Soft pill with a leading dot: calm at a glance, never a loud banner. */
export function StatusBadge({
  status,
  className,
}: {
  status: ResultKey;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        TONE[status],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-(--dot)" aria-hidden="true" />
      {STATUS_LABELS[status]}
    </span>
  );
}
