"use client";

import { useLinkStatus } from "next/link";

/**
 * Rendered inside a <Link>. While that link's navigation is pending it shows
 * a small spinner, so a click is acknowledged before the next page arrives.
 */
export function LinkPending({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden="true"
      className={`ml-auto size-3 shrink-0 rounded-full border-[1.5px] border-current border-t-transparent transition-opacity duration-150 ${
        pending ? "animate-spin opacity-60" : "opacity-0"
      } ${className ?? ""}`}
    />
  );
}
