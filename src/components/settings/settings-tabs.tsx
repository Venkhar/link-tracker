"use client";

import { useState } from "react";
import { User, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsTabsProps {
  profileContent: React.ReactNode;
  proxyContent: React.ReactNode;
  proxyCount: number;
}

export function SettingsTabs({ profileContent, proxyContent, proxyCount }: SettingsTabsProps) {
  const [tab, setTab] = useState<"profile" | "proxy">("profile");

  return (
    <div className="space-y-6">
      {/* ── Tab bar — editorial hairline style ─────────────────── */}
      <div className="flex gap-6 border-b border-ink/20">
        <TabButton
          active={tab === "profile"}
          onClick={() => setTab("profile")}
          icon={User}
          label="Profil"
          folio="01"
        />
        <TabButton
          active={tab === "proxy"}
          onClick={() => setTab("proxy")}
          icon={Globe}
          label="Proxy"
          folio="02"
          badge={proxyCount > 0 ? proxyCount : undefined}
        />
      </div>

      {tab === "profile" && profileContent}
      {tab === "proxy" && proxyContent}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  folio,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  folio: string;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-2 pb-3 pt-1 text-sm transition-colors",
        active ? "text-ink" : "text-ink-3 hover:text-ink"
      )}
    >
      <span className={cn(
        "mono text-[10px] tabular-nums",
        active ? "text-rust" : "text-ink-4"
      )}>
        {folio}
      </span>
      <Icon className="h-3.5 w-3.5" />
      <span className="font-medium">{label}</span>
      {badge !== undefined && (
        <span className={cn(
          "ml-1 rounded-[2px] px-1.5 py-0.5 text-[10px] font-bold tabular-nums uppercase",
          active ? "bg-signal text-signal-ink" : "bg-paper-deep text-ink-3"
        )}>
          {badge}
        </span>
      )}
      {/* active indicator */}
      <span className={cn(
        "absolute -bottom-px left-0 right-0 h-0.5 bg-ink transition-opacity",
        active ? "opacity-100" : "opacity-0"
      )} />
    </button>
  );
}
