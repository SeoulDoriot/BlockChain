import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Sign in" };

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
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <div className="mb-10 flex flex-col items-center text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <ShieldCheck className="size-7" strokeWidth={1.75} />
          </span>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-3 text-base text-muted-foreground text-pretty">
            Sign in to issue and manage your organization&rsquo;s certificates.
          </p>
        </div>

        <div className="rounded-3xl border bg-card p-8 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
            <LoginFormWithRedirect searchParams={searchParams} />
          </Suspense>
        </div>

        <p className="mt-8 text-center text-[15px] text-muted-foreground">
          Just need to check a certificate?{" "}
          <Link href="/verify" className="text-foreground underline-offset-4 hover:underline">
            Verify one
          </Link>
        </p>
      </div>
    </main>
  );
}
