import { redirect } from "next/navigation";
import { Suspense } from "react";

/**
 * Landing target for the plain-HTML lookup form.
 *
 * Because this route exists, the form on the home page can be an ordinary
 * `<form method="get">` that the browser submits itself — no client component,
 * no hydration, no JavaScript on the critical path, and it still works with
 * scripting disabled.
 */
async function Redirector({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}): Promise<React.ReactNode> {
  const { id } = await searchParams;
  const trimmed = id?.trim();

  // redirect() throws, so nothing after this runs.
  redirect(trimmed ? `/verify/${encodeURIComponent(trimmed)}` : "/");
}

export default function VerifyIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <Redirector searchParams={searchParams} />
    </Suspense>
  );
}
