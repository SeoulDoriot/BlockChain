import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * A plain HTML GET form. The browser navigates to /verify?id=… and the route
 * redirects to /verify/<id>.
 *
 * Deliberately NOT a client component: the landing page is the most-visited
 * page in the system and the one most likely to be opened on a phone with a
 * poor connection, so it ships no JavaScript for this at all. It also keeps
 * working with JS disabled.
 */
export function VerifyByIdForm({
  labels,
  inline = false,
}: {
  labels: { certificateId: string; hint: string; verify: string };
  /** Input and button on one row from the `sm` breakpoint up. */
  inline?: boolean;
}) {
  return (
    <form action="/verify" method="get" className="space-y-3">
      <label htmlFor="certificate-id" className="sr-only">
        {labels.certificateId}
      </label>
      <div className={inline ? "flex flex-col gap-3 sm:flex-row" : "space-y-4"}>
        <input
          id="certificate-id"
          name="id"
          required
          placeholder={labels.certificateId}
          autoComplete="off"
          spellCheck={false}
          aria-describedby="certificate-id-hint"
          className={
            inline
              ? "h-14 w-full min-w-0 shrink-0 rounded-2xl border border-input bg-background sm:w-auto sm:flex-1 px-5 font-mono text-base outline-none transition-[border-color,box-shadow] duration-200 placeholder:font-sans placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/25"
              : "h-16 w-full rounded-2xl border border-input bg-card px-6 text-center font-mono text-lg outline-none transition-[border-color,box-shadow] duration-200 placeholder:font-sans placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/25 sm:h-[4.5rem] sm:text-xl"
          }
        />
        <Button
          type="submit"
          size="lg"
          className={
            inline
              ? "h-14 rounded-2xl px-8 text-base"
              : "h-14 w-full rounded-2xl text-lg sm:h-16"
          }
        >
          {labels.verify} <ArrowRight strokeWidth={2} />
        </Button>
      </div>
      <p
        id="certificate-id-hint"
        className={inline ? "text-sm text-muted-foreground" : "text-center text-sm text-muted-foreground"}
      >
        {labels.hint}
      </p>
    </form>
  );
}
