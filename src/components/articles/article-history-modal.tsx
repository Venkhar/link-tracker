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

  const chip =
    check.status === "FOUND"      ? "chip-signal" :
    check.status === "REDIRECTED" ? "chip-ochre" :
    check.status === "ERROR"      ? "chip-ochre" :
                                    "chip-rust";

  const StatusIcon =
    check.status === "FOUND"      ? CheckCircle2 :
    check.status === "ERROR"      ? AlertTriangle : XCircle;

  return (
    <div className="flex items-start gap-3 py-3">
      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
        <StatusIcon className={cn(
          "h-4 w-4",
          check.status === "FOUND" ? "text-ink" :
          check.status === "ERROR" ? "text-ochre" : "text-rust"
        )} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn("inline-flex items-center rounded-[2px] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em]", chip)}>
            {check.status}
          </span>
          {check.httpCode && (
            <span className="mono text-[10px] text-ink-4 tabular-nums">HTTP {check.httpCode}</span>
          )}
          {check.status === "FOUND" && check.isDofollow !== null && (
            <span className={cn(
              "inline-flex items-center rounded-[2px] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em]",
              check.isDofollow ? "chip-signal" : "bg-paper-deep text-ink-3"
            )}>
              {check.isDofollow ? "dofollow" : "nofollow"}
            </span>
          )}
        </div>
        {check.redirectUrl && (
          <div className="mt-1 flex items-center gap-1 text-[10px] text-ink-3">
            <CornerDownRight className="h-3 w-3 shrink-0" />
            <span className="truncate mono">{check.redirectUrl}</span>
          </div>
        )}
      </div>
      <span className="shrink-0 mono text-[10px] tabular-nums text-ink-4">{date}</span>
    </div>
  );
}

function IndexationRow({ check }: { check: IndexationCheck }) {
  const date = new Date(check.checkedAt).toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const chip =
    check.status === "INDEXED" ? "chip-azure" :
    check.status === "UNKNOWN" ? "chip-ochre" :
                                 "chip-ochre";

  const label =
    check.status === "INDEXED" ? "Indexé" :
    check.status === "UNKNOWN" ? "Erreur check" : "Non indexé";

  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex h-5 w-5 shrink-0 items-center justify-center">
        <Eye className={cn("h-4 w-4", check.status === "INDEXED" ? "text-azure" : "text-ink-3")} />
      </div>
      <span className={cn("inline-flex items-center rounded-[2px] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em]", chip)}>
        {label}
      </span>
      <span className="ml-auto shrink-0 mono text-[10px] tabular-nums text-ink-4">{date}</span>
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

  const hostname = (() => { try { return new URL(articleUrl).hostname.replace(/^www\./, ""); } catch { return articleUrl; } })();

  return (
    <>
      <button
        onClick={openModal}
        className="inline-flex h-7 w-7 items-center justify-center rounded-[3px] border border-ink/15 bg-paper text-ink-3 transition-colors hover:border-ink/40 hover:text-ink hover:bg-paper-deep/60"
        title="Historique des vérifications"
      >
        <History className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/50 backdrop-blur-[1px]" onClick={() => setOpen(false)} />

          <div className="relative z-10 w-full max-w-lg bg-paper rounded-md overflow-hidden fade-up" style={{ boxShadow: "3px 3px 0 0 rgba(26, 24, 22, 0.9), 0 0 0 1px rgba(26, 24, 22, 0.9)" }}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-ink/20 px-5 py-4">
              <div className="min-w-0">
                <span className="eyebrow">Historique</span>
                <p className="font-serif text-lg tracking-tight text-ink mt-0.5">Vérifications</p>
                <p className="mt-1 truncate mono text-[11px] text-ink-3">{hostname}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="ml-4 shrink-0 rounded-[3px] p-1.5 text-ink-3 hover:bg-paper-deep hover:text-ink transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-ink/15">
              {(["backlink", "indexation"] as const).map((t, i) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "relative flex-1 py-3 text-[11px] font-medium uppercase tracking-[0.1em] transition-colors",
                    tab === t ? "text-ink bg-paper" : "text-ink-3 bg-paper-deep/40 hover:text-ink"
                  )}
                >
                  <span className={cn("mr-1.5 mono text-[10px] tabular-nums", tab === t ? "text-rust" : "text-ink-4")}>
                    0{i + 1}
                  </span>
                  {t === "backlink" ? "Présence" : "Indexation"}
                  {data && (
                    <span className={cn(
                      "ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-[2px] px-1 mono text-[10px] font-bold tabular-nums",
                      tab === t ? "bg-signal text-signal-ink" : "bg-paper-deep text-ink-3"
                    )}>
                      {t === "backlink" ? data.backlinkChecks.length : data.indexationChecks.length}
                    </span>
                  )}
                  {tab === t && <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-ink" />}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="max-h-[400px] overflow-y-auto px-5">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-ink border-t-transparent" />
                </div>
              ) : !data ? (
                <p className="py-8 text-center font-serif italic text-sm text-ink-3">Erreur de chargement</p>
              ) : tab === "backlink" ? (
                data.backlinkChecks.length === 0 ? (
                  <p className="py-8 text-center font-serif italic text-sm text-ink-3">Aucune vérification effectuée</p>
                ) : (
                  <div className="divide-y divide-ink/10">
                    {data.backlinkChecks.map((c) => <BacklinkRow key={c.id} check={c} />)}
                  </div>
                )
              ) : (
                data.indexationChecks.length === 0 ? (
                  <p className="py-8 text-center font-serif italic text-sm text-ink-3">Aucune vérification effectuée</p>
                ) : (
                  <div className="divide-y divide-ink/10">
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
