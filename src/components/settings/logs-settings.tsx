"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  RefreshCw, Trash2, Loader2, AlertTriangle, Info, XCircle,
  ChevronDown, Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LogEntry {
  id: string;
  level: "INFO" | "WARN" | "ERROR";
  action: string;
  message: string;
  details: string | null;
  createdAt: string;
}

const LEVEL_CONFIG: Record<LogEntry["level"], {
  icon: React.ElementType;
  chip: string;
  rail: string;
}> = {
  INFO:  { icon: Info,           chip: "chip-azure",                   rail: "bg-azure" },
  WARN:  { icon: AlertTriangle,  chip: "chip-ochre",                   rail: "bg-ochre" },
  ERROR: { icon: XCircle,        chip: "bg-rust text-white",           rail: "bg-rust" },
};

type LevelFilter = "ALL" | "INFO" | "WARN" | "ERROR";

export function LogsSettings() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("ALL");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const fetchLogs = useCallback(async (cursor?: string) => {
    const params = new URLSearchParams();
    if (levelFilter !== "ALL") params.set("level", levelFilter);
    params.set("limit", "50");
    if (cursor) params.set("cursor", cursor);

    const res = await fetch(`/api/logs?${params}`);
    if (!res.ok) throw new Error("Erreur chargement logs");
    return res.json() as Promise<{ logs: LogEntry[]; nextCursor: string | null }>;
  }, [levelFilter]);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchLogs();
      setLogs(data.logs);
      setNextCursor(data.nextCursor);
    } catch {
      toast.error("Impossible de charger les logs");
    } finally {
      setLoading(false);
    }
  }, [fetchLogs]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const data = await fetchLogs();
      setLogs(data.logs);
      setNextCursor(data.nextCursor);
    } catch {
      toast.error("Erreur lors du rafraîchissement");
    } finally {
      setRefreshing(false);
    }
  }

  async function handleLoadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const data = await fetchLogs(nextCursor);
      setLogs((prev) => [...prev, ...data.logs]);
      setNextCursor(data.nextCursor);
    } catch {
      toast.error("Erreur chargement");
    } finally {
      setLoadingMore(false);
    }
  }

  async function handlePurge() {
    if (!confirm("Supprimer tous les logs ? Cette action est irréversible.")) return;
    const res = await fetch("/api/logs", { method: "DELETE" });
    if (res.ok) {
      const data = await res.json();
      toast.success(`${data.deleted} log(s) supprimé(s)`);
      setLogs([]);
      setNextCursor(null);
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Erreur lors de la purge");
    }
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  }

  function formatAction(action: string) {
    return action.replace(/\./g, " · ");
  }

  const counts = { INFO: 0, WARN: 0, ERROR: 0 };
  logs.forEach((l) => counts[l.level]++);

  return (
    <div className="space-y-6">
      {/* ── Filtres + actions ──────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap border-b border-ink/15 pb-4">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="h-3.5 w-3.5 shrink-0 text-ink-3 mr-1" />
          {(["ALL", "INFO", "WARN", "ERROR"] as LevelFilter[]).map((lvl) => {
            const active = levelFilter === lvl;
            return (
              <button
                key={lvl}
                onClick={() => setLevelFilter(lvl)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-[2px] border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em] transition-colors",
                  active
                    ? "border-ink bg-ink text-paper"
                    : "border-ink/20 bg-transparent text-ink-3 hover:border-ink/40 hover:text-ink"
                )}
              >
                {lvl === "ALL" ? "Tous" : lvl}
                {lvl !== "ALL" && (
                  <span className={cn(
                    "mono tabular-nums text-[10px]",
                    active ? "text-paper/60" : "text-ink-4"
                  )}>
                    {counts[lvl]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-[3px] border border-ink/20 bg-transparent px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-ink hover:bg-ink/5 transition-colors disabled:opacity-60"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            Rafraîchir
          </button>
          <button
            onClick={handlePurge}
            className="inline-flex items-center gap-1.5 rounded-[3px] border border-rust/40 bg-transparent px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-rust hover:bg-rust-soft transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Purger
          </button>
        </div>
      </div>

      {/* ── Liste des logs — colonne éditoriale avec rail ──── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-ink-3" />
        </div>
      ) : logs.length === 0 ? (
        <div className="border border-dashed border-ink/25 bg-paper-deep/30 py-16 text-center rounded-md">
          <Info className="mx-auto h-7 w-7 text-ink-4" />
          <p className="mt-3 font-serif text-lg text-ink italic">Aucun log enregistré.</p>
          <p className="mt-1 text-xs text-ink-3">Les actions apparaîtront ici dès qu&apos;elles seront exécutées.</p>
        </div>
      ) : (
        <ul className="border-t border-b border-ink/20">
          {logs.map((log, i) => {
            const cfg = LEVEL_CONFIG[log.level];
            const Icon = cfg.icon;
            const isExpanded = expandedIds.has(log.id);
            let parsedDetails: Record<string, unknown> | null = null;
            if (log.details) {
              try { parsedDetails = JSON.parse(log.details); } catch { /* ignore */ }
            }

            return (
              <li
                key={log.id}
                className={cn(
                  "group relative",
                  i !== logs.length - 1 && "border-b border-ink/10"
                )}
              >
                {/* Colored rail */}
                <span className={cn("absolute left-0 top-0 bottom-0 w-0.5", cfg.rail)} />

                <button
                  type="button"
                  onClick={() => log.details ? toggleExpand(log.id) : undefined}
                  className={cn(
                    "flex w-full items-start gap-3 pl-5 pr-4 py-4 text-left transition-colors",
                    log.details && "hover:bg-paper-deep/40 cursor-pointer",
                    !log.details && "cursor-default"
                  )}
                >
                  <span className="mono text-[10px] text-ink-4 tabular-nums w-7 shrink-0 mt-1">
                    {String(i + 1).padStart(3, "0")}
                  </span>

                  <span className={cn(
                    "mt-0.5 inline-flex items-center gap-1 rounded-[2px] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] shrink-0",
                    cfg.chip
                  )}>
                    <Icon className="h-3 w-3" />
                    {log.level}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="mono text-[10px] font-semibold text-ink-2 bg-paper-deep rounded-[2px] px-1.5 py-0.5">
                        {formatAction(log.action)}
                      </span>
                      <span className="mono text-[11px] text-ink-4 tabular-nums shrink-0">
                        {formatDate(log.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm text-ink leading-snug">
                      {log.message}
                    </p>
                  </div>

                  {log.details && (
                    <ChevronDown className={cn(
                      "h-4 w-4 shrink-0 text-ink-4 transition-transform mt-1",
                      isExpanded && "rotate-180"
                    )} />
                  )}
                </button>

                {isExpanded && parsedDetails && (
                  <div className="border-t border-ink/10 bg-ink text-paper px-5 py-4 pl-12">
                    <pre className="overflow-x-auto text-[11px] mono text-paper/85 leading-relaxed">
                      {JSON.stringify(parsedDetails, null, 2)}
                    </pre>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* ── Load more ────────────────────────────────────── */}
      {nextCursor && (
        <div className="flex justify-center">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="inline-flex items-center gap-1.5 rounded-[3px] border border-ink/20 bg-transparent px-4 py-2 text-[11px] font-medium uppercase tracking-[0.1em] text-ink hover:bg-ink/5 transition-colors disabled:opacity-60"
          >
            {loadingMore ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Charger plus
          </button>
        </div>
      )}
    </div>
  );
}
