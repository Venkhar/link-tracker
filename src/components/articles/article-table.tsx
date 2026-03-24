"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Trash2, ExternalLink, Link2Off, Globe,
  Pencil, RefreshCw, Search,
  CheckCircle2, XCircle, Eye, Link2, Store,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Article {
  id: string;
  articleUrl: string;
  targetUrl: string;
  anchorText: string | null;
  manualStatus: string;
  prix: number | null;
  type: string;
  source: string | null;
  backlinkChecks?: { status: string; isDofollow: boolean | null; checkedAt: string }[];
  indexationChecks?: { status: string; checkedAt: string }[];
}

interface ArticleTableProps {
  articles: Article[];
  campaignId: string;
  isAdmin: boolean;
}

function getHostname(url: string): string {
  try { return new URL(url).hostname; } catch { return url; }
}

function ArticleLink({ url, maxWidth = "max-w-[300px]" }: { url: string; maxWidth?: string }) {
  const display = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={url}
      className={cn("group inline-flex items-center gap-1", maxWidth)}
    >
      <span className="truncate font-mono text-[11px] text-indigo-600 underline underline-offset-2 group-hover:text-indigo-800 transition-colors">
        {display}
      </span>
      <ExternalLink className="h-2.5 w-2.5 shrink-0 text-slate-300 group-hover:text-indigo-400 transition-colors" />
    </a>
  );
}

function ActiveBadge({ status }: { status?: string }) {
  if (!status) return null;
  const active = status === "FOUND";
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold w-fit",
      active
        ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
        : "bg-red-50 text-red-600 ring-1 ring-inset ring-red-200"
    )}>
      {active
        ? <CheckCircle2 className="h-3.5 w-3.5" />
        : <XCircle className="h-3.5 w-3.5" />
      }
      {active ? "Actif" : "Inactif"}
    </span>
  );
}

function DofollowBadge({ isDofollow, backlinkStatus }: { isDofollow?: boolean | null; backlinkStatus?: string }) {
  if (backlinkStatus !== "FOUND") return null;
  if (isDofollow === null || isDofollow === undefined) return null;
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold w-fit",
      isDofollow
        ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
        : "bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-200"
    )}>
      <CheckCircle2 className="h-3.5 w-3.5" />
      {isDofollow ? "dofollow" : "nofollow"}
    </span>
  );
}

function IndexedBadge({ status }: { status?: string }) {
  if (!status || status === "UNKNOWN") return null;
  const indexed = status === "INDEXED";
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold w-fit",
      indexed
        ? "bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-200"
        : "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200"
    )}>
      <Eye className="h-3.5 w-3.5" />
      {indexed ? "Indexé" : "Non indexé"}
    </span>
  );
}

const TH = "px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-400";

export function ArticleTable({ articles, campaignId, isAdmin }: ArticleTableProps) {
  const router = useRouter();

  async function handleDelete(articleId: string) {
    if (!confirm("Supprimer ce backlink ?")) return;
    const res = await fetch(`/api/campaigns/${campaignId}/articles/${articleId}`, { method: "DELETE" });
    if (res.ok) { toast.success("Backlink supprimé"); router.refresh(); }
    else toast.error("Erreur lors de la suppression");
  }

  async function handleCheck(articleId: string, type: "backlink" | "indexation") {
    const label = type === "backlink" ? "backlink" : "indexation";
    toast.loading(`Vérification ${label} en cours…`, { id: `check-${articleId}-${type}` });
    const res = await fetch(
      `/api/campaigns/${campaignId}/articles/${articleId}/check`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      }
    );
    if (res.ok) {
      toast.success("Vérification terminée", { id: `check-${articleId}-${type}` });
      router.refresh();
    } else {
      toast.error("Erreur lors de la vérification", { id: `check-${articleId}-${type}` });
    }
  }

  if (articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <Link2Off className="h-5 w-5 text-slate-400" />
        </div>
        <p className="text-sm font-semibold text-slate-700">Aucun backlink enregistré</p>
        <p className="mt-1 text-sm text-slate-400">Ajoutez des backlinks manuellement ou importez un fichier CSV.</p>
      </div>
    );
  }

  const grouped = articles.reduce<Record<string, Article[]>>((acc, a) => {
    const d = getHostname(a.articleUrl);
    (acc[d] ??= []).push(a);
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      {Object.entries(grouped).map(([domain, rows]) => (
        <div key={domain} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          {/* ── Domain header ─────────────────────────────── */}
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5">
            <Globe className="h-4 w-4 text-slate-400" />
            <a
              href={`https://${domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-sm font-semibold text-indigo-600 underline underline-offset-2 hover:text-indigo-800 transition-colors"
            >
              {domain}
            </a>
            <span className="text-xs text-slate-400">
              ({rows.length} {rows.length > 1 ? "liens" : "lien"})
            </span>
          </div>

          {/* ── Table ──────────────────────────────────────── */}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className={TH}>Informations</th>
                <th className={cn(TH, "w-[170px]")}>Statut</th>
                <th className={cn(TH, "w-[150px]")}>Dernière vérification</th>
                <th className={cn(TH, "w-[130px]")}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((article) => {
                const lastCheck = article.backlinkChecks?.[0];
                const lastIdx   = article.indexationChecks?.[0];
                const checkedAt = lastCheck?.checkedAt
                  ? new Date(lastCheck.checkedAt).toLocaleString("fr-FR", {
                      day: "2-digit", month: "2-digit", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })
                  : null;

                return (
                  <tr
                    key={article.id}
                    className="group align-top transition-colors hover:bg-slate-50/60"
                  >
                    {/* ── Informations ──────────────────── */}
                    <td className="px-4 py-3.5">
                      <div className="space-y-1.5">

                        {/* Line 1: domain + anchor + prix/DR/TF/DA */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-slate-800">{domain}</span>
                          {article.anchorText ? (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
                              &ldquo;{article.anchorText}&rdquo;
                            </span>
                          ) : (
                            <span className="rounded bg-orange-50 px-1.5 py-0.5 text-[10px] font-medium text-orange-600 ring-1 ring-inset ring-orange-200">
                              Aucune ancre
                            </span>
                          )}
                          <div className="ml-auto flex items-center gap-3 text-[10px] text-slate-400 shrink-0">
                            <span>
                              PRIX{" "}
                              <span className="font-mono font-bold text-slate-700">
                                {article.prix != null
                                  ? article.prix.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })
                                  : "—"}
                              </span>
                            </span>
                            <span>DR <span className="font-semibold text-slate-500">-</span></span>
                            <span>TF <span className="font-semibold text-slate-500">-</span></span>
                            <span>DA <span className="font-semibold text-slate-500">-</span></span>
                          </div>
                        </div>

                        {/* Line 2: Article URL */}
                        <div className="flex items-center gap-1.5">
                          <span className="shrink-0 text-[10px] font-medium text-slate-400">URL :</span>
                          <ArticleLink url={article.articleUrl} maxWidth="max-w-[400px]" />
                        </div>

                        {/* Line 3: Target URL */}
                        <div className="flex items-center gap-1.5">
                          <span className="shrink-0 text-[10px] font-medium text-slate-400">Pointe vers :</span>
                          <ArticleLink url={article.targetUrl} maxWidth="max-w-[360px]" />
                        </div>

                        {/* Line 4: Type + Source */}
                        <div className="flex items-center gap-4 text-[11px] text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <Link2 className="h-3 w-3 text-slate-400" />
                            Type :{" "}
                            <span className="font-medium text-slate-700">
                              {article.type === "ARTICLE" ? "Article" : article.type === "FORUM" ? "Forum" : "Communiqué"}
                            </span>
                          </span>
                          {article.source && (
                            <span className="inline-flex items-center gap-1">
                              <Store className="h-3 w-3 text-slate-400" />
                              Source :{" "}
                              <span className="font-medium text-slate-700">{article.source}</span>
                            </span>
                          )}
                        </div>

                      </div>
                    </td>

                    {/* ── Statut : 3 badges empilés ─────── */}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col gap-1.5">
                        <ActiveBadge status={lastCheck?.status} />
                        <DofollowBadge
                          isDofollow={lastCheck?.isDofollow}
                          backlinkStatus={lastCheck?.status}
                        />
                        <IndexedBadge status={lastIdx?.status} />
                      </div>
                    </td>

                    {/* ── Dernière vérification ─────────── */}
                    <td className="px-4 py-3.5">
                      {checkedAt
                        ? <span className="text-xs text-slate-500 tabular-nums">{checkedAt}</span>
                        : <span className="select-none text-xs text-slate-300">—</span>
                      }
                    </td>

                    {/* ── Actions ───────────────────────── */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        <button
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 shadow-sm transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
                          title="Modifier"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleCheck(article.id, "backlink")}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 shadow-sm transition-colors hover:border-sky-200 hover:bg-sky-50 hover:text-sky-600"
                          title="Vérifier le backlink"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleCheck(article.id, "indexation")}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 shadow-sm transition-colors hover:border-teal-200 hover:bg-teal-50 hover:text-teal-600"
                          title="Vérifier l'indexation"
                        >
                          <Search className="h-3.5 w-3.5" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(article.id)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 shadow-sm transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                            title="Supprimer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
