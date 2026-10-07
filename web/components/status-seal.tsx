import type { ResultKey } from "@/lib/status";
import { cn } from "@/lib/utils";

const PRESENTATION: Record<
  ResultKey,
  { label: string; blurb: string; className: string; icon: string }
> = {
  tampered: {
    label: "Tampered",
    blurb:
      "The certificate details do not match what was recorded on the blockchain.",
    className:
      "bg-red-50 text-red-700",
    icon: "M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z",
  },
  active: {
    label: "Certificate verified",
    blurb: "This certificate is authentic and has been successfully verified.",
    className:
      "bg-emerald-50 text-emerald-700",
    icon: "M20 6 9 17l-5-5",
  },
  expired: {
    label: "Certificate expired",
    blurb: "This certificate is authentic, but its validity period has ended.",
    className:
      "bg-amber-50 text-amber-700",
    icon: "M12 8v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  },
  revoked: {
    label: "Certificate revoked",
    blurb: "This certificate was withdrawn by the issuing organization.",
    className:
      "bg-red-50 text-red-700",
    icon: "M18 6 6 18M6 6l12 12",
  },
  not_found: {
    label: "Not found",
    blurb: "No certificate with this identifier has been issued.",
    className:
      "bg-zinc-100 text-zinc-600",
    icon: "M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z",
  },
  unrecorded: {
    label: "Not verified",
    blurb:
      "This certificate is in our records, but its fingerprint is not on the blockchain, so it cannot be confirmed as genuine.",
    className: "bg-amber-50 text-amber-700",
    icon: "M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z",
  },
  unavailable: {
    label: "Can't verify right now",
    blurb:
      "We couldn't reach the blockchain to check this certificate. Please try again in a moment.",
    className: "bg-zinc-100 text-zinc-600",
    icon: "M12 8v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  },
  draft: {
    label: "Not yet issued",
    blurb: "This certificate exists as a draft and has not been anchored.",
    className:
      "bg-zinc-100 text-zinc-600",
    icon: "M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z",
  },
};

export function StatusSeal({
  status,
  tampered = false,
  labels,
  heading: Heading = "h2",
}: {
  status: ResultKey;
  /** The page title on /verify/[id]; a section heading elsewhere. */
  heading?: "h1" | "h2";
  tampered?: boolean;
  /** Optional translations; falls back to the English presentation. */
  labels?: Record<ResultKey, { label: string; blurb: string }>;
}) {
  const key: ResultKey = tampered ? "tampered" : status;
  const presentation = {
    ...PRESENTATION[key],
    ...(labels ? labels[key] : {}),
  };

  return (
    <div className="flex flex-col items-center text-center" role="status" aria-live="polite">
      <span
        className={cn(
          "flex size-20 items-center justify-center rounded-full sm:size-24",
          presentation.className,
        )}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-10 sm:size-12"
          aria-hidden="true"
        >
          <path d={presentation.icon} />
        </svg>
      </span>
      <Heading className="mt-6 text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
        {presentation.label}
      </Heading>
      <p className="mt-3 max-w-lg text-base text-muted-foreground text-pretty sm:text-lg">
        {presentation.blurb}
      </p>
    </div>
  );
}
