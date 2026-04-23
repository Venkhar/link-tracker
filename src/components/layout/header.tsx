"use client";

import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, LogOut, ChevronDown, Settings } from "lucide-react";
import { MobileSidebar } from "./mobile-sidebar";
import Link from "next/link";
import { useEffect, useState } from "react";

const SECTION_BY_PATH: Array<{ prefix: string; section: string; folio: string }> = [
  { prefix: "/campaigns", section: "Campagnes",  folio: "§02" },
  { prefix: "/logs",      section: "Logs",       folio: "§03" },
  { prefix: "/settings",  section: "Paramètres", folio: "§04" },
];

function detectSection(pathname: string) {
  if (pathname === "/") return { section: "Dashboard", folio: "§01" };
  const found = SECTION_BY_PATH.find((s) => pathname.startsWith(s.prefix));
  return found ?? { section: "Dashboard", folio: "§01" };
}

export function Header() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { section, folio } = detectSection(pathname);

  const [time, setTime] = useState<string>("");
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    const tick = () => {
      const d = new Date();
      const t = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
      setTime(`${fmt.format(d)} · ${t}`);
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  const initials = session?.user?.name
    ? session.user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <header className="shrink-0 bg-paper">
      {/* Top thin ticker strip */}
      <div className="flex items-center justify-between border-b border-ink/15 px-6 md:px-10 lg:px-14 py-2 text-[10px] uppercase tracking-[0.18em] text-ink-3">
        <span className="mono">{time || "—"}</span>
        <span className="hidden sm:flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-signal animate-pulse" />
          Observatoire actif
        </span>
      </div>

      {/* Folio / section / account row */}
      <div className="flex h-16 items-center justify-between px-6 md:px-10 lg:px-14 border-b border-ink/20">
        <div className="flex items-center gap-4 min-w-0">
          <Sheet>
            <SheetTrigger
              render={<Button variant="ghost" size="icon" className="md:hidden h-8 w-8" />}
            >
              <Menu className="h-4 w-4" />
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 bg-ink border-0">
              <MobileSidebar />
            </SheetContent>
          </Sheet>

          <div className="flex items-baseline gap-3 min-w-0">
            <span className="font-mono text-[11px] text-ink-4 tabular-nums shrink-0">{folio}</span>
            <h2 className="font-serif text-[22px] leading-none tracking-tightest text-ink truncate">
              {section}
            </h2>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                className="flex items-center gap-2.5 h-9 px-2 hover:bg-ink/5 rounded-[3px]"
              />
            }
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-paper font-mono">
              {initials}
            </div>
            <div className="hidden sm:flex flex-col items-start">
              <span className="text-sm font-medium leading-none text-ink">{session?.user?.name}</span>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-ink-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-3 py-2.5">
              <p className="text-xs font-semibold text-ink">{session?.user?.name}</p>
              <p className="mono text-[11px] text-ink-3 truncate mt-0.5">{session?.user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Paramètres
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-rust focus:text-rust cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Se déconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
