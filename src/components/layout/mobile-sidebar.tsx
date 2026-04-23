"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Megaphone,
  Settings,
  ScrollText,
} from "lucide-react";

const navItems = [
  { href: "/",          label: "Dashboard",  folio: "01", icon: LayoutDashboard },
  { href: "/campaigns", label: "Campagnes",  folio: "02", icon: Megaphone },
  { href: "/logs",      label: "Logs",       folio: "03", icon: ScrollText },
  { href: "/settings",  label: "Paramètres", folio: "04", icon: Settings },
];

export function MobileSidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-ink text-paper">
      <div className="px-6 pt-7 pb-5 border-b border-paper/10">
        <span className="eyebrow text-paper/50">Édition No.IV</span>
        <h1 className="mt-2 font-serif text-2xl tracking-tightest">
          Link<span className="italic text-signal">tracker</span>
        </h1>
      </div>
      <nav className="flex-1 space-y-0.5 p-3">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-[3px] px-3 py-2.5 text-sm transition-colors",
                isActive
                  ? "bg-paper text-ink"
                  : "text-paper/70 hover:bg-paper/5 hover:text-paper"
              )}
            >
              <span
                className={cn(
                  "font-mono text-[10px] tabular-nums",
                  isActive ? "text-rust" : "text-paper/30"
                )}
              >
                {item.folio}
              </span>
              <item.icon className="h-4 w-4 stroke-[1.75]" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
