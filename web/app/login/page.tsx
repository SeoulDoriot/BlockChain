import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = { title: "Staff sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Staff sign in</h1>
      <p className="mt-2 text-sm text-muted-foreground text-pretty">
        Only registered staff can issue certificates. Verifying one needs no
        account.
      </p>

      <div className="mt-8">
        <LoginForm next={next} />
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
