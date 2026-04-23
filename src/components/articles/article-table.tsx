"use client";

import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Trash2, ExternalLink, Link2Off, Globe,
  Pencil, RefreshCw, Search,
  CheckCircle2, XCircle, Eye, Link2, Store, ChevronDown, Filter,
  ChevronsDownUp, ChevronsUpDown, RotateCcw, Loader2,
} from "lucide-react";
import { ArticleHistoryModal } from "./article-history-modal";
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
      <span className="truncate mono text-[11px] text-ink hover:text-rust transition-colors underline decoration-ink/20 decoration-[1px] underline-offset-[3px] group-hover:decoration-rust">
        {display}
      </span>
      <ExternalLink className="h-2.5 w-2.5 shrink-0 text-ink-4 group-hover:text-rust transition-colors" />
    </a>
  );
}

function ActiveBadge({ status }: { status?: string }) {
  if (!status) return null;
  const active = status === "FOUND";
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-[2px] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] w-fit",
      active ? "chip-signal" : "chip-rust"
    )}>
      {active ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {active ? "Actif" : "Inactif"}
    </span>
  );
}

function DofollowBadge({ isDofollow, backlinkStatus }: { isDofollow?: boolean | null; backlinkStatus?: string }) {
  if (backlinkStatus !== "FOUND") return null;
  if (isDofollow === null || isDofollow === undefined) return null;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-[2px] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] w-fit",
      isDofollow ? "chip-signal" : "bg-paper-deep text-ink-3"
    )}>
      <CheckCircle2 className="h-3 w-3" />
      {isDofollow ? "dofollow" : "nofollow"}
    </span>
  );
}

function IndexedBadge({ status }: { status?: string }) {
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1 rounded-[2px] bg-paper-deep px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-ink-4 w-fit">
        <Eye className="h-3 w-3" />
        Non vérifié
      </span>
    );
  }
  if (status === "UNKNOWN") {
    return (
      <span className="inline-flex items-center gap-1 rounded-[2px] chip-ochre px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] w-fit">
        <Eye className="h-3 w-3" />
        Erreur check
      </span>
    );
  }
  const indexed = status === "INDEXED";
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-[2px] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] w-fit",
      indexed ? "chip-azure" : "chip-ochre"
    )}>
      <Eye className="h-3 w-3" />
      {indexed ? "Indexé" : "Non indexé"}
    </span>
  );
}

const TH = "px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-3";

type FilterKey = "ALL" | "FOUND" | "NOT_FOUND" | "DOFOLLOW" | "NOFOLLOW" | "INDEXED" | "NOT_INDEXED";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "ALL",        label: "Tous" },
  { key: "FOUND",      label: "Actifs" },
  { key: "NOT_FOUND",  label: "Inactifs" },
  { key: "DOFOLLOW",   label: "Dofollow" },
  { key: "NOFOLLOW",   label: "Nofollow" },
  { key: "INDEXED",    label: "Indexés" },
  { key: "NOT_INDEXED",label: "Non indexés" },
];

export function ArticleTable({ articles, campaignId, isAdmin }: ArticleTableProps) {
  const router = useRouter();
  const [openDomains, setOpenDomains] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<FilterKey>("ALL");
  const [checking, setChecking] = useState(false);

  const filteredArticles = useMemo(() => {
    if (activeFilter === "ALL") return articles;
    return articles.filter((a) => {
      const bl = a.backlinkChecks?.[0];
      const idx = a.indexationChecks?.[0];
      switch (activeFilter) {
        case "FOUND":       return bl?.status === "FOUND";
        case "NOT_FOUND":   return bl?.status === "NOT_FOUND" || bl?.status === "ERROR" || bl?.status === "REDIRECTED";
        case "DOFOLLOW":    return bl?.status === "FOUND" && bl?.isDofollow === true;
        case "NOFOLLOW":    return bl?.status === "FOUND" && bl?.isDofollow === false;
        case "INDEXED":     return idx?.status === "INDEXED";
        case "NOT_INDEXED": return idx?.status === "NOT_INDEXED";
        default:            return true;
      }
    });
  }, [articles, activeFilter]);

  function toggleDomain(domain: string) {
    setOpenDomains((prev) => {
      const next = new Set(prev);
      if (next.has(domain)) next.delete(domain);
      else next.add(domain);
      return next;
    });
  }

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
      <div className="flex flex-col items-center justify-center border border-dashed border-ink/25 bg-paper-deep/30 py-16 text-center rounded-md">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-paper-deep">
          <Link2Off className="h-5 w-5 text-ink-3" />
        </div>
        <p className="font-serif text-xl text-ink italic">Aucun backlink enregistré</p>
        <p className="mt-2 text-sm text-ink-3">Ajoutez des backlinks manuellement ou importez un fichier CSV.</p>
      </div>
    );
  }

  const grouped = filteredArticles.reduce<Record<string, Article[]>>((acc, a) => {
    const d = getHostname(a.articleUrl);
    (acc[d] ??= []).push(a);
    return acc;
  }, {});

  async function handleCheckAll() {
    setChecking(true);
    toast.loading("Vérification de tous les backlinks en cours…", { id: "check-all" });
    const res = await fetch(`/api/campaigns/${campaignId}/check-all`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "all" }),
    });
    setChecking(false);
    if (res.ok) {
      const data = await res.json();
      toast.success(`Vérification lancée pour ${data.count} backlink(s) — résultats disponibles dans quelques minutes`, { id: "check-all", duration: 6000 });
    } else {
      toast.error("Erreur lors du lancement des vérifications", { id: "check-all" });
    }
  }

  function actionBtn(title: string) {
    return "inline-flex h-7 w-7 items-center justify-center rounded-[3px] border border-ink/15 bg-paper text-ink-3 transition-colors hover:border-ink/40 hover:text-ink hover:bg-paper-deep/60";
  }

  return (
    <div className="space-y-5">
      {/* ── Actions globales ─────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOpenDomains(new Set(Object.keys(
              articles.reduce<Record<string, true>>((acc, a) => { acc[getHostname(a.articleUrl)] = true; return acc; }, {})
            )))}
            className="inline-flex items-center gap-1.5 rounded-[3px] border border-ink/20 bg-transparent px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-ink hover:bg-ink/5 transition-colors"
            title="Tout ouvrir"
          >
            <ChevronsUpDown className="h-3.5 w-3.5" />
            Tout ouvrir
          </button>
          <button
            onClick={() => setOpenDomains(new Set())}
            className="inline-flex items-center gap-1.5 rounded-[3px] border border-ink/20 bg-transparent px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-ink hover:bg-ink/5 transition-colors"
            title="Tout fermer"
          >
            <ChevronsDownUp className="h-3.5 w-3.5" />
            Tout fermer
          </button>
        </div>
        <button
          onClick={handleCheckAll}
          disabled={checking}
          className="btn-ink disabled:opacity-60"
          title="Relancer tous les checks"
        >
          {checking
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <RotateCcw className="h-3.5 w-3.5" />
          }
          Re-vérifier tout
        </button>
      </div>

      {/* ── Filtres éditoriaux ───────────────────────────── */}
      <div className="flex items-center gap-1.5 flex-wrap border-b border-ink/15 pb-3">
        <Filter className="h-3.5 w-3.5 shrink-0 text-ink-3 mr-1" />
        {FILTERS.map(({ key, label }) => {
          const active = activeFilter === key;
          const count = key === "ALL"
            ? articles.length
            : articles.filter((a) => {
                const bl = a.backlinkChecks?.[0];
                const idx = a.indexationChecks?.[0];
                switch (key) {
                  case "FOUND":       return bl?.status === "FOUND";
                  case "NOT_FOUND":   return bl?.status === "NOT_FOUND" || bl?.status === "ERROR" || bl?.status === "REDIRECTED";
                  case "DOFOLLOW":    return bl?.status === "FOUND" && bl?.isDofollow === true;
                  case "NOFOLLOW":    return bl?.status === "FOUND" && bl?.isDofollow === false;
                  case "INDEXED":     return idx?.status === "INDEXED";
                  case "NOT_INDEXED": return idx?.status === "NOT_INDEXED";
                  default:            return false;
                }
              }).length;
          return (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-[2px] border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em] transition-colors",
                active
                  ? "border-ink bg-ink text-paper"
                  : "border-ink/20 bg-transparent text-ink-3 hover:border-ink/40 hover:text-ink"
              )}
            >
              {label}
              <span className={cn(
                "mono tabular-nums text-[10px]",
                active ? "text-paper/60" : "text-ink-4"
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {filteredArticles.length === 0 && activeFilter !== "ALL" && (
        <div className="border border-dashed border-ink/20 py-10 text-center rounded-md">
          <p className="font-serif italic text-ink-3">Aucun backlink ne correspond à ce filtre.</p>
        </div>
      )}

      {Object.entries(grouped).map(([domain, rows]) => {
        const isOpen = openDomains.has(domain);
        return (
        <div key={domain} className="sheet overflow-hidden">

          {/* ── Domain header ──────────────────────────── */}
          <button
            type="button"
            onClick={() => toggleDomain(domain)}
            className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-paper-deep/40 border-b border-transparent data-[open=true]:border-ink/15"
            data-open={isOpen}
          >
            <Globe className="h-4 w-4 shrink-0 text-ink-3" />
            <span className="mono text-sm font-medium text-ink">
              {domain}
            </span>
            <span className="mono text-[11px] text-ink-4 tabular-nums">
              · {rows.length} lien{rows.length > 1 ? "s" : ""}
            </span>
            <ChevronDown
              className={cn(
                "ml-auto h-4 w-4 shrink-0 text-ink-3 transition-transform duration-200",
                isOpen && "rotate-180"
              )}
            />
          </button>

          {/* ── Vue compacte ──────────────────────────── */}
          {!isOpen && (
            <div className="divide-y divide-ink/10 border-t border-ink/10">
              {rows.map((article) => {
                const lastCheck = article.backlinkChecks?.[0];
                const lastIdx   = article.indexationChecks?.[0];
                const path = (() => {
                  try { const u = new URL(article.articleUrl); return (u.pathname + u.search).replace(/\/$/, "") || "/"; }
                  catch { return article.articleUrl; }
                })();
                return (
                  <div key={article.id} className="flex items-center gap-3 px-5 py-2.5">
                    <a
                      href={article.articleUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="min-w-0 flex-1 truncate mono text-[11px] text-ink-3 hover:text-ink transition-colors"
                      title={article.articleUrl}
                    >
                      {path}
                    </a>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <ActiveBadge status={lastCheck?.status} />
                      <DofollowBadge isDofollow={lastCheck?.isDofollow} backlinkStatus={lastCheck?.status} />
                      <IndexedBadge status={lastIdx?.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Table détaillée ───────────────────────── */}
          {isOpen && <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/15">
                <th className={TH}>Informations</th>
                <th className={cn(TH, "w-[170px]")}>Statut</th>
                <th className={cn(TH, "w-[150px]")}>Dernière vérification</th>
                <th className={cn(TH, "w-[150px]")}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((article, i) => {
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
                    className={cn(
                      "group align-top transition-colors hover:bg-paper-deep/30",
                      i !== rows.length - 1 && "border-b border-ink/10"
                    )}
                  >
                    <td className="px-4 py-4">
                      <div className="space-y-1.5">

                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="mono text-xs font-semibold text-ink">{domain}</span>
                          {article.anchorText ? (
                            <span className="rounded-[2px] bg-paper-deep px-1.5 py-0.5 font-serif italic text-[11px] text-ink-2">
                              «&nbsp;{article.anchorText}&nbsp;»
                            </span>
                          ) : (
                            <span className="rounded-[2px] chip-ochre px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em]">
                              Aucune ancre
                            </span>
                          )}
                          <div className="ml-auto flex items-center gap-3 text-[10px] text-ink-4 shrink-0 eyebrow">
                            <span>
                              Prix{" "}
                              <span className="mono font-bold text-ink">
                                {article.prix != null
                                  ? article.prix.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })
                                  : "—"}
                              </span>
                            </span>
                            <span>DR <span className="font-semibold text-ink-3">-</span></span>
                            <span>TF <span className="font-semibold text-ink-3">-</span></span>
                            <span>DA <span className="font-semibold text-ink-3">-</span></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="shrink-0 eyebrow">URL</span>
                          <ArticleLink url={article.articleUrl} maxWidth="max-w-[400px]" />
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="shrink-0 eyebrow">Pointe vers</span>
                          <ArticleLink url={article.targetUrl} maxWidth="max-w-[360px]" />
                        </div>

                        <div className="flex items-center gap-4 text-[11px] text-ink-3 pt-0.5">
                          <span className="inline-flex items-center gap-1">
                            <Link2 className="h-3 w-3 text-ink-4" />
                            <span className="eyebrow">Type</span>
                            <span className="font-medium text-ink">
                              {article.type === "ARTICLE" ? "Article" : article.type === "FORUM" ? "Forum" : "Communiqué"}
                            </span>
                          </span>
                          {article.source && (
                            <span className="inline-flex items-center gap-1">
                              <Store className="h-3 w-3 text-ink-4" />
                              <span className="eyebrow">Source</span>
                              <span className="font-medium text-ink">{article.source}</span>
                            </span>
                          )}
                        </div>

                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1.5">
                        <ActiveBadge status={lastCheck?.status} />
                        <DofollowBadge
                          isDofollow={lastCheck?.isDofollow}
                          backlinkStatus={lastCheck?.status}
                        />
                        <IndexedBadge status={lastIdx?.status} />
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      {checkedAt
                        ? <span className="mono text-[11px] text-ink-2 tabular-nums">{checkedAt}</span>
                        : <span className="select-none text-xs text-ink-4">—</span>
                      }
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => router.push(`/campaigns/${campaignId}/articles/${article.id}/edit`)}
                          className={actionBtn("Modifier")}
                          title="Modifier"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <ArticleHistoryModal
                          articleId={article.id}
                          campaignId={campaignId}
                          articleUrl={article.articleUrl}
                        />
                        <button
                          onClick={() => handleCheck(article.id, "backlink")}
                          className={actionBtn("Vérifier backlink")}
                          title="Vérifier le backlink"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleCheck(article.id, "indexation")}
                          className={actionBtn("Vérifier indexation")}
                          title="Vérifier l'indexation"
                        >
                          <Search className="h-3.5 w-3.5" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(article.id)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-[3px] border border-ink/15 bg-paper text-ink-4 transition-colors hover:border-rust/40 hover:bg-rust-soft hover:text-rust"
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
          </table>}
        </div>
        );
      })}
    </div>
  );
}
