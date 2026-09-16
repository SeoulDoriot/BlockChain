import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Staff sign in" };

/**
 * searchParams is runtime data, so reading it here — inside Suspense — lets
 * the rest of the page prerender as a static shell.
 */
async function LoginFormWithRedirect({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return <LoginForm next={next} />;
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Staff sign in</h1>
      <p className="mt-2 text-sm text-muted-foreground text-pretty">
        Only registered staff can issue certificates. Verifying one needs no
        account.
      </p>

      <div className="mt-8">
        <Suspense fallback={<Skeleton className="h-56 w-full rounded-lg" />}>
          <LoginFormWithRedirect searchParams={searchParams} />
        </Suspense>
      </div>

      <Link
        href="/"
        className="mt-8 text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        ← Back to verification
      </Link>
    </main>
  );
}
