import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut, ShieldCheck } from "lucide-react";
import { requireStaff, AuthError } from "@/lib/auth";
import { signOut } from "@/app/login/actions";
import { BottomNav, SidebarNav } from "@/components/app-nav";
import { Toaster } from "@/components/ui/sonner";

/**
 * Every dashboard route reads the session cookie to authenticate, so none of
 * them can be prerendered into a static shell. Opting out of instant-navigation
 * validation tells Next.js this segment is expected to block on auth.
 */
export const instant = false;

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

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

  const { org, staff } = context;

  const logout = (
    <form action={signOut}>
      <button
        type="submit"
        aria-label="Log out"
        title="Log out"
        className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-sidebar-accent hover:text-foreground"
      >
        <LogOut className="size-4" strokeWidth={1.75} />
      </button>
    </form>
  );

  return (
    <div className="min-h-dvh lg:pl-60">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r bg-sidebar px-3 py-5 lg:flex">
        <Link
          href="/dashboard"
          className="mb-8 flex items-center gap-2 px-3 text-[15px] font-semibold tracking-tight"
        >
          <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ShieldCheck className="size-3.5" strokeWidth={2} />
          </span>
          Certify
        </Link>

        <div className="flex-1 overflow-y-auto">
          <SidebarNav />
        </div>

        <div className="mt-4 flex items-center gap-2.5 border-t pt-4">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium">
            {initials(org.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{org.name}</p>
            <p className="truncate text-xs text-muted-foreground">{staff.email}</p>
          </div>
          {logout}
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/90 px-4 py-3 backdrop-blur-sm lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
          <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ShieldCheck className="size-3.5" strokeWidth={2} />
          </span>
          Certify
        </Link>
        <div className="flex items-center gap-2">
          <span className="max-w-40 truncate text-sm text-muted-foreground">{org.name}</span>
          {logout}
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-4 py-8 pb-28 sm:px-8 lg:px-10 lg:py-10 lg:pb-12">
        {children}
      </main>

      <BottomNav />

      {/* Toasts are only raised by dashboard actions, so sonner is mounted
          here rather than in the root layout — public pages ship none of it. */}
      <Toaster richColors position="top-center" />
    </div>
  );
}
