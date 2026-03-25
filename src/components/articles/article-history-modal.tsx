"use client";

import { useState } from "react";
import { History, X, CheckCircle2, XCircle, AlertTriangle, CornerDownRight, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface BacklinkCheck {
  id: string;
  checkedAt: string;
  status: string;
  httpCode: number | null;
  redirectUrl: string | null;
  isDofollow: boolean | null;
}

interface IndexationCheck {
  id: string;
  checkedAt: string;
  status: string;
}

interface ArticleHistoryModalProps {
  articleId: string;
  campaignId: string;
  articleUrl: string;
}

function BacklinkRow({ check }: { check: BacklinkCheck }) {
  const date = new Date(check.checkedAt).toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const statusColor =
    check.status === "FOUND"      ? "text-emerald-600 bg-emerald-50 ring-emerald-200" :
    check.status === "REDIRECTED" ? "text-amber-600 bg-amber-50 ring-amber-200" :
    check.status === "ERROR"      ? "text-orange-600 bg-orange-50 ring-orange-200" :
                                    "text-red-600 bg-red-50 ring-red-200";

  const StatusIcon =
    check.status === "FOUND"      ? CheckCircle2 :
    check.status === "ERROR"      ? AlertTriangle : XCircle;

  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
        <StatusIcon className={cn("h-4 w-4", check.status === "FOUND" ? "text-emerald-500" : check.status === "ERROR" ? "text-orange-400" : "text-red-400")} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset", statusColor)}>
            {check.status}
          </span>
          {check.httpCode && (
            <span className="text-[10px] text-slate-400">HTTP {check.httpCode}</span>
          )}
          {check.status === "FOUND" && check.isDofollow !== null && (
            <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
              check.isDofollow ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-slate-100 text-slate-500 ring-slate-200"
            )}>
              {check.isDofollow ? "dofollow" : "nofollow"}
            </span>
          )}
        </div>
        {check.redirectUrl && (
          <div className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-400">
            <CornerDownRight className="h-3 w-3 shrink-0" />
            <span className="truncate font-mono">{check.redirectUrl}</span>
          </div>
        )}
      </div>
      <span className="shrink-0 text-[10px] tabular-nums text-slate-400">{date}</span>
    </div>
  );
}

function IndexationRow({ check }: { check: IndexationCheck }) {
  const date = new Date(check.checkedAt).toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const style =
    check.status === "INDEXED"     ? "text-teal-600 bg-teal-50 ring-teal-200" :
    check.status === "UNKNOWN"     ? "text-orange-600 bg-orange-50 ring-orange-200" :
                                     "text-amber-600 bg-amber-50 ring-amber-200";

  const label =
    check.status === "INDEXED" ? "Indexé" :
    check.status === "UNKNOWN" ? "Erreur check" : "Non indexé";

  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
        <Eye className={cn("h-4 w-4", check.status === "INDEXED" ? "text-teal-500" : "text-slate-400")} />
      </div>
      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset", style)}>
        {label}
      </span>
      <span className="ml-auto shrink-0 text-[10px] tabular-nums text-slate-400">{date}</span>
    </div>
  );
}

export function ArticleHistoryModal({ articleId, campaignId, articleUrl }: ArticleHistoryModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ backlinkChecks: BacklinkCheck[]; indexationChecks: IndexationCheck[] } | null>(null);
  const [tab, setTab] = useState<"backlink" | "indexation">("backlink");

  async function openModal() {
    setOpen(true);
    if (data) return;
    setLoading(true);
    const res = await fetch(`/api/campaigns/${campaignId}/articles/${articleId}`);
    if (res.ok) {
      const json = await res.json();
      setData({ backlinkChecks: json.backlinkChecks, indexationChecks: json.indexationChecks });
    }
    setLoading(false);
  }

  const hostname = (() => { try { return new URL(articleUrl).hostname; } catch { return articleUrl; } })();

  return (
    <>
      <button
        onClick={openModal}
        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 shadow-sm transition-colors hover:border-violet-200 hover:bg-violet-50 hover:text-violet-600"
        title="Historique des vérifications"
      >
        <History className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />

          {/* Modal */}
          <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">Historique des vérifications</p>
                <p className="mt-0.5 truncate font-mono text-[11px] text-slate-400">{hostname}</p>
              </div>
              <button onClick={() => setOpen(false)} className="ml-4 shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-100">
              {(["backlink", "indexation"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "flex-1 py-2.5 text-xs font-semibold transition-colors",
                    tab === t
                      ? "border-b-2 border-indigo-500 text-indigo-600"
                      : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  {t === "backlink" ? "Présence du lien" : "Indexation"}
                  {data && (
                    <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-slate-100 px-1 text-[10px] font-bold text-slate-500">
                      {t === "backlink" ? data.backlinkChecks.length : data.indexationChecks.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="max-h-[400px] overflow-y-auto px-5">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
                </div>
              ) : !data ? (
                <p className="py-8 text-center text-sm text-slate-400">Erreur de chargement</p>
              ) : tab === "backlink" ? (
                data.backlinkChecks.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-400">Aucune vérification effectuée</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {data.backlinkChecks.map((c) => <BacklinkRow key={c.id} check={c} />)}
                  </div>
                )
              ) : (
                data.indexationChecks.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-400">Aucune vérification effectuée</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {data.indexationChecks.map((c) => <IndexationRow key={c.id} check={c} />)}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
