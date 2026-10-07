"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  FileText,
  LayoutDashboard,
  LayoutTemplate,
  PlusCircle,
  ScrollText,
  Users,
  ScanLine,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LinkPending } from "@/components/nav-progress";

interface Item {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Match exactly rather than by prefix. */
  exact?: boolean;
  mobile?: boolean;
}

const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true, mobile: true },
    ],
  },
  {
    title: "Certificates",
    items: [
      { href: "/dashboard/certificates/new", label: "Issue Certificate", icon: PlusCircle, exact: true, mobile: true },
      { href: "/dashboard/certificates", label: "Certificates", icon: FileText, mobile: true },
      { href: "/dashboard/courses", label: "Courses", icon: BookOpen },
    ],
  },
  {
    title: "Verification",
    items: [{ href: "/dashboard/verify", label: "Verification", icon: ScanLine, mobile: true }],
  },
  {
    title: "Workspace",
    items: [
      { href: "/dashboard/templates", label: "Templates", icon: LayoutTemplate },
      { href: "/dashboard/audit", label: "Audit log", icon: ScrollText },
      { href: "/dashboard/admin", label: "Issuers", icon: Users },
      { href: "/dashboard/settings", label: "Settings", icon: Settings, mobile: true },
    ],
  },
];

function useActive() {
  const pathname = usePathname();
  // "/dashboard/certificates" must not light up on ".../new" or on its own.
  const all = GROUPS.flatMap((g) => g.items);
  const best = all
    .filter((i) => (i.exact ? pathname === i.href : pathname.startsWith(i.href)))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return best?.href;
}

export function SidebarNav() {
  const active = useActive();
  return (
    <nav aria-label="Dashboard" className="space-y-6">
      {GROUPS.map((group) => (
        <div key={group.title}>
          <p className="px-3 pb-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            {group.title}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const isActive = item.href === active;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors duration-150",
                      isActive
                        ? "bg-sidebar-accent font-medium text-foreground"
                        : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                    )}
                  >
                    <item.icon className="size-4 shrink-0" strokeWidth={1.75} />
                    {item.label}
                    <LinkPending />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function BottomNav() {
  const active = useActive();
  const items = GROUPS.flatMap((g) => g.items).filter((i) => i.mobile);
  return (
    <nav
      aria-label="Dashboard"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm lg:hidden"
    >
      {items.map((item) => {
        const isActive = item.href === active;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-2.5 text-[10px] transition-colors",
              isActive ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <item.icon className="size-5" strokeWidth={1.75} />
            <span className="max-w-full truncate">{item.label.replace(" Certificate", "")}</span>
          </Link>
        );
      })}
    </nav>
  );
}
