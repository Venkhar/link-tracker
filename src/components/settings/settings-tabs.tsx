"use client";

import { useState } from "react";
import { User, Globe, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "profile" | "proxy" | "logs";

interface SettingsTabsProps {
  profileContent: React.ReactNode;
  proxyContent: React.ReactNode;
  logsContent: React.ReactNode;
  proxyCount: number;
}

export function SettingsTabs({ profileContent, proxyContent, logsContent, proxyCount }: SettingsTabsProps) {
  const [tab, setTab] = useState<Tab>("profile");

  const tabs: { key: Tab; label: string; icon: React.ElementType; badge?: number }[] = [
    { key: "profile", label: "Profil", icon: User },
    { key: "proxy", label: "Proxy", icon: Globe, badge: proxyCount || undefined },
    { key: "logs", label: "Logs", icon: ScrollText },
  ];

  return (
    <div className="space-y-5">
      {/* ── Tab bar ───────────────────────────────────────────── */}
      <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1">
        {tabs.map(({ key, label, icon: Icon, badge }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
              tab === key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {badge != null && badge > 0 && (
              <span className={cn(
                "ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                tab === key
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-gray-200 text-gray-600"
              )}>
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Contenu ───────────────────────────────────────────── */}
      {tab === "profile" && profileContent}
      {tab === "proxy" && proxyContent}
      {tab === "logs" && logsContent}
    </div>
  );
}
