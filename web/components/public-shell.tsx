import { ViewTransition } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Chrome for the public pages. Pure server markup — no client JavaScript —
 * so these pages stay fast on a poor connection and work without scripting.
 */
export function PublicShell({
  children,
  actions,
  signedIn = false,
  width = "max-w-2xl",
  className,
}: {
  children: React.ReactNode;
  actions?: React.ReactNode;
  /** Signed-in staff get a way back to the dashboard instead of "Sign in". */
  signedIn?: boolean;
  width?: string;
  className?: string;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 sm:px-10">
        <Link href={signedIn ? "/dashboard" : "/"} className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheck className="size-4" strokeWidth={2} />
          </span>
          Certify
        </Link>
        <div className="flex items-center gap-3">
          {actions}
          <Link
            href={signedIn ? "/dashboard" : "/login"}
            className="rounded-lg px-3.5 py-2 text-[15px] text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground"
          >
            {signedIn ? "Dashboard" : "Sign in"}
          </Link>
        </div>
      </header>
      <main className={cn("mx-auto w-full flex-1 px-6 pt-8 pb-20 sm:px-10", width, className)}>
        <ViewTransition default="none" enter="page-swap" exit="page-swap">
          {children}
        </ViewTransition>
      </main>
      <footer className="px-6 pb-10 text-center text-sm text-muted-foreground">
        Kirirom Institute of Technology
      </footer>
    </div>
  );
}
