import type { DisplayStatus } from "@/lib/status";
import { cn } from "@/lib/utils";

const PRESENTATION: Record<
  DisplayStatus,
  { label: string; blurb: string; className: string; icon: string }
> = {
  tampered: {
    label: "Tampered",
    blurb:
      "The certificate details do not match what was recorded on the blockchain.",
    className:
      "border-red-600/30 bg-red-50 text-red-900 dark:border-red-400/25 dark:bg-red-950/40 dark:text-red-100",
    icon: "M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z",
  },
  active: {
    label: "Valid",
    blurb: "This certificate is genuine and currently valid.",
    className:
      "border-emerald-600/30 bg-emerald-50 text-emerald-900 dark:border-emerald-400/25 dark:bg-emerald-950/40 dark:text-emerald-100",
    icon: "M20 6 9 17l-5-5",
  },
  expired: {
    label: "Expired",
    blurb: "This certificate is genuine, but its validity period has ended.",
    className:
      "border-amber-600/30 bg-amber-50 text-amber-900 dark:border-amber-400/25 dark:bg-amber-950/40 dark:text-amber-100",
    icon: "M12 8v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  },
  revoked: {
    label: "Revoked",
    blurb: "This certificate was withdrawn by the issuing institution.",
    className:
      "border-red-600/30 bg-red-50 text-red-900 dark:border-red-400/25 dark:bg-red-950/40 dark:text-red-100",
    icon: "M18 6 6 18M6 6l12 12",
  },
  not_found: {
    label: "Not found",
    blurb: "No certificate with this identifier has been issued.",
    className:
      "border-zinc-400/40 bg-zinc-50 text-zinc-900 dark:border-zinc-500/30 dark:bg-zinc-900 dark:text-zinc-100",
    icon: "M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z",
  },
  draft: {
    label: "Not yet issued",
    blurb: "This certificate exists as a draft and has not been anchored.",
    className:
      "border-zinc-400/40 bg-zinc-50 text-zinc-900 dark:border-zinc-500/30 dark:bg-zinc-900 dark:text-zinc-100",
    icon: "M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z",
  },
};

export function StatusSeal({
  status,
  tampered = false,
  labels,
}: {
  status: DisplayStatus;
  tampered?: boolean;
  /** Optional translations; falls back to the English presentation. */
  labels?: Record<DisplayStatus, { label: string; blurb: string }>;
}) {
  const key: DisplayStatus = tampered ? "tampered" : status;
  const presentation = {
    ...PRESENTATION[key],
    ...(labels ? labels[key] : {}),
  };

  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-xl border px-5 py-4",
        presentation.className,
      )}
      role="status"
      aria-live="polite"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.25}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-9 shrink-0"
        aria-hidden="true"
      >
        <path d={presentation.icon} />
      </svg>
      <div className="min-w-0">
        <p className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {presentation.label}
        </p>
        <p className="text-sm opacity-90 text-pretty">{presentation.blurb}</p>
      </div>
    </div>
  );
}
