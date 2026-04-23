"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Megaphone, Settings, ScrollText } from "lucide-react";

const navItems = [
  { href: "/",          label: "Dashboard",  folio: "01", icon: LayoutDashboard },
  { href: "/campaigns", label: "Campagnes",  folio: "02", icon: Megaphone },
  { href: "/logs",      label: "Logs",       folio: "03", icon: ScrollText },
  { href: "/settings",  label: "Paramètres", folio: "04", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col bg-ink text-paper relative overflow-hidden">
      {/* Masthead */}
      <div className="relative px-6 pt-8 pb-7 border-b border-paper/10">
        <div className="flex items-baseline gap-2">
          <span className="eyebrow text-paper/50">Édition No.IV</span>
          <span className="ml-auto font-mono text-[10px] text-paper/40 tabular-nums">MMXXVI</span>
        </div>
        <h1 className="mt-3 font-serif text-[30px] leading-[0.9] tracking-tightest text-paper">
          Link<span className="italic text-signal">tracker</span>
        </h1>
        <p className="mt-2 text-[11px] text-paper/55 leading-snug max-w-[180px]">
          L&apos;observatoire éditorial <br /> des backlinks SEO.
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-0.5">
        {navItems.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-[3px] px-3 py-2.5 text-sm transition-all relative",
                isActive
                  ? "bg-paper text-ink"
                  : "text-paper/70 hover:bg-paper/5 hover:text-paper"
              )}
            >
              <span
                className={cn(
                  "font-mono text-[10px] tabular-nums",
                  isActive ? "text-rust" : "text-paper/30 group-hover:text-paper/60"
                )}
              >
                {item.folio}
              </span>
              <item.icon className="h-[15px] w-[15px] stroke-[1.75]" />
              <span className="font-medium tracking-tight">{item.label}</span>
              {isActive && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-signal" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Colophon */}
      <div className="border-t border-paper/10 px-6 py-5 space-y-3">
        <div className="flex items-center justify-between text-[10px] text-paper/40 uppercase tracking-[0.18em]">
          <span>Colophon</span>
          <span className="font-mono">v1.0</span>
        </div>
        <div className="text-[10px] text-paper/55 leading-relaxed font-serif italic">
          «&nbsp;Chaque lien est un témoin. <br /> On les observe, on les archive.&nbsp;»
        </div>
      </div>
    </aside>
  );
}
