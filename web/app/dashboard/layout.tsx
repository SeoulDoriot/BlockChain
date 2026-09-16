import Link from "next/link";
import { redirect } from "next/navigation";
import { requireStaff, AuthError } from "@/lib/auth";
import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui/button";

/**
 * Every dashboard route reads the session cookie to authenticate, so none of
 * them can be prerendered into a static shell. Opting out of instant-navigation
 * validation tells Next.js this segment is expected to block on auth.
 */
export const instant = false;

const NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/certificates", label: "Certificates" },
  { href: "/dashboard/audit", label: "Audit log" },
  { href: "/dashboard/admin", label: "Issuers" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let context;
  try {
    context = await requireStaff();
  } catch (error) {
    if (error instanceof AuthError && error.status === 401) {
      redirect("/login?next=/dashboard");
    }
    throw error;
  }

  return (
    <div className="min-h-dvh">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-3 px-6 py-4">
          <Link href="/dashboard" className="font-semibold tracking-tight">
            {context.org.name}
          </Link>

          <nav aria-label="Dashboard" className="flex flex-wrap gap-x-4 gap-y-2">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ms-auto flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {context.staff.email}
            </span>
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
