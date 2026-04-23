"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Eye, Globe, Search, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; chip: string; dot: string }> = {
  ACTIVE:    { label: "Active",   chip: "chip-signal", dot: "bg-signal-ink" },
  PAUSED:    { label: "En pause", chip: "chip-ochre",  dot: "bg-ochre" },
  COMPLETED: { label: "Terminée", chip: "bg-paper-deep text-ink-3", dot: "bg-ink-4" },
};

interface Campaign {
  id: string;
  name: string;
  targetDomain: string;
  plateforme: string | null;
  status: string;
  createdAt: string;
  createdBy: { name: string };
  _count: { articles: number };
}

interface CampaignTableProps {
  campaigns: Campaign[];
  isAdmin: boolean;
}

export function CampaignTable({ campaigns, isAdmin }: CampaignTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeDomain, setActiveDomain] = useState<string | null>(null);

  const domains = useMemo(
    () => Array.from(new Set(campaigns.map((c) => c.targetDomain))).sort(),
    [campaigns]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return campaigns.filter((c) => {
      const matchSearch = !q || c.name.toLowerCase().includes(q) || c.targetDomain.toLowerCase().includes(q);
      const matchDomain = !activeDomain || c.targetDomain === activeDomain;
      return matchSearch && matchDomain;
    });
  }, [campaigns, search, activeDomain]);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Supprimer la campagne "${name}" ? Cette action est irréversible.`)) return;
    const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Campagne supprimée");
      router.refresh();
    } else {
      toast.error("Erreur lors de la suppression");
    }
  }

  if (campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center border border-dashed border-ink/25 bg-paper-deep/30 py-20 text-center rounded-md">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-paper-deep">
          <Globe className="h-5 w-5 text-ink-3" />
        </div>
        <p className="font-serif text-xl tracking-tight text-ink">Aucune campagne</p>
        <p className="mt-2 text-sm text-ink-3 italic font-serif">Créez votre première campagne pour commencer.</p>
        <Link href="/campaigns/new" className="btn-ink mt-5">
          Créer une campagne
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── Recherche + filtres ──────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-4 pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher une campagne ou un domaine…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-[3px] border border-ink/20 bg-paper pl-9 pr-9 text-sm text-ink placeholder:text-ink-4 outline-none focus:border-ink transition"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-ink-4 hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {domains.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="eyebrow shrink-0 mr-1">Site</span>
            {domains.map((d) => (
              <button
                key={d}
                onClick={() => setActiveDomain(activeDomain === d ? null : d)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-[2px] border px-2.5 py-1 mono text-[11px] font-medium transition-colors",
                  activeDomain === d
                    ? "border-ink bg-ink text-paper"
                    : "border-ink/20 bg-transparent text-ink-3 hover:border-ink/40 hover:text-ink"
                )}
              >
                <Globe className="h-3 w-3 shrink-0" />
                {d}
              </button>
            ))}
            {activeDomain && (
              <button
                onClick={() => setActiveDomain(null)}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-ink-4 hover:text-rust transition-colors"
              >
                <X className="h-3 w-3" />
                Réinitialiser
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Tableau éditorial ────────────────────────────────── */}
      <div className="border-t border-b border-ink/25 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="mb-3 h-7 w-7 text-ink-4" />
            <p className="font-serif text-lg text-ink italic">Aucun résultat</p>
            <p className="mt-1 text-xs text-ink-3">Modifiez votre recherche ou réinitialisez les filtres.</p>
          </div>
        ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink/15">
              <Th>Campagne</Th>
              <Th>Site</Th>
              <Th>Statut</Th>
              <Th align="center">Articles</Th>
              <Th>Plateforme</Th>
              <Th>Créé par</Th>
              <Th>Date</Th>
              <Th align="right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((campaign, i) => {
              const s = statusConfig[campaign.status] || statusConfig.ACTIVE;
              return (
                <tr
                  key={campaign.id}
                  className={cn(
                    "group transition-colors hover:bg-paper-deep/40",
                    i !== filtered.length - 1 && "border-b border-ink/10"
                  )}
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <span className="mono text-[10px] text-ink-4 tabular-nums w-6">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <p className="font-medium text-ink">{campaign.name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-1.5 mono text-xs text-ink-2">
                      <Globe className="h-3.5 w-3.5 shrink-0 text-ink-4" />
                      {campaign.targetDomain}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-[2px] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] ${s.chip}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                      {s.label}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="figure-display text-[22px] text-ink">{campaign._count.articles}</span>
                  </td>
                  <td className="px-4 py-4">
                    {campaign.plateforme
                      ? <span className="text-xs text-ink-2 italic font-serif">{campaign.plateforme}</span>
                      : <span className="text-xs text-ink-4">—</span>
                    }
                  </td>
                  <td className="px-4 py-4 text-ink-3 text-xs">{campaign.createdBy.name}</td>
                  <td className="px-4 py-4 text-ink-4 text-[11px] mono tabular-nums">
                    {format(new Date(campaign.createdAt), "dd.MM.yyyy")}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-0.5">
                      <Link href={`/campaigns/${campaign.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-ink-3 hover:text-ink hover:bg-paper-deep">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/campaigns/${campaign.id}/edit`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-ink-3 hover:text-ink hover:bg-paper-deep">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-ink-4 hover:text-rust hover:bg-rust-soft"
                          onClick={() => handleDelete(campaign.id, campaign.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        )}
      </div>
    </div>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "center" | "right" }) {
  return (
    <th className={cn(
      "px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-3",
      align === "left" && "text-left",
      align === "center" && "text-center",
      align === "right" && "text-right",
    )}>
      {children}
    </th>
  );
}
