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

const LEVEL_CONFIG = {
  INFO: {
    icon: Info,
    bg: "bg-sky-50",
    text: "text-sky-700",
    ring: "ring-sky-200",
    dot: "bg-sky-400",
  },
  WARN: {
    icon: AlertTriangle,
    bg: "bg-amber-50",
    text: "text-amber-700",
    ring: "ring-amber-200",
    dot: "bg-amber-400",
  },
  ERROR: {
    icon: XCircle,
    bg: "bg-red-50",
    text: "text-red-600",
    ring: "ring-red-200",
    dot: "bg-red-400",
  },
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
      next.has(id) ? next.delete(id) : next.add(id);
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
    return action.replace(/\./g, " > ");
  }

  // Compteurs par level
  const counts = { INFO: 0, WARN: 0, ERROR: 0 };
  logs.forEach((l) => counts[l.level]++);

  return (
    <div className="space-y-4">
      {/* ── Header + Actions ─────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-3.5 w-3.5 shrink-0 text-gray-400" />
          {(["ALL", "INFO", "WARN", "ERROR"] as LevelFilter[]).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setLevelFilter(lvl)}
              className={cn(
                "rounded-full border px-3 py-1 text-[11px] font-medium transition-colors",
                levelFilter === lvl
                  ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                  : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700"
              )}
            >
              {lvl === "ALL" ? "Tous" : lvl}
              {lvl !== "ALL" && (
                <span className="ml-1 text-[10px] text-gray-400">
                  ({counts[lvl]})
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            Rafraîchir
          </button>
          <button
            onClick={handlePurge}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 shadow-sm transition-colors hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Purger
          </button>
        </div>
      </div>

      {/* ── Liste des logs ────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white py-12 text-center">
          <Info className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-2 text-sm text-gray-400">Aucun log enregistré.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden divide-y divide-gray-100">
          {logs.map((log) => {
            const cfg = LEVEL_CONFIG[log.level];
            const Icon = cfg.icon;
            const isExpanded = expandedIds.has(log.id);
            let parsedDetails: Record<string, unknown> | null = null;
            if (log.details) {
              try { parsedDetails = JSON.parse(log.details); } catch { /* ignore */ }
            }

            return (
              <div key={log.id} className="group">
                <button
                  type="button"
                  onClick={() => log.details ? toggleExpand(log.id) : undefined}
                  className={cn(
                    "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors",
                    log.details && "hover:bg-gray-50 cursor-pointer",
                    !log.details && "cursor-default"
                  )}
                >
                  {/* Badge level */}
                  <span className={cn(
                    "mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset shrink-0",
                    cfg.bg, cfg.text, cfg.ring
                  )}>
                    <Icon className="h-3 w-3" />
                    {log.level}
                  </span>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-gray-600">
                        {formatAction(log.action)}
                      </span>
                      <span className="text-[11px] text-gray-400 tabular-nums shrink-0">
                        {formatDate(log.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-700 leading-snug">
                      {log.message}
                    </p>
                  </div>

                  {/* Chevron si details */}
                  {log.details && (
                    <ChevronDown className={cn(
                      "h-4 w-4 shrink-0 text-gray-300 transition-transform mt-1",
                      isExpanded && "rotate-180"
                    )} />
                  )}
                </button>

                {/* Details JSON */}
                {isExpanded && parsedDetails && (
                  <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                    <pre className="overflow-x-auto text-[11px] font-mono text-gray-600 leading-relaxed">
                      {JSON.stringify(parsedDetails, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Load more ─────────────────────────────────────────── */}
      {nextCursor && (
        <div className="flex justify-center">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-60"
          >
            {loadingMore ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Charger plus
          </button>
        </div>
      )}
    </div>
  );
}
