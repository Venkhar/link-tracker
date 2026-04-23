"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Plus, Trash2, Globe, ToggleLeft, ToggleRight,
  Info, List, AlignJustify, CheckSquare,
  Square, MinusSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isValidProxyInput } from "@/lib/proxy-utils";

interface Proxy {
  id: string;
  url: string;
  label: string | null;
  isActive: boolean;
  createdAt: string;
}

interface ProxySettingsProps {
  initialProxies: Proxy[];
}

function maskProxyUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.password) return url.replace(`:${parsed.password}@`, ":****@");
    return url;
  } catch { return url; }
}

function proxyProtocol(url: string): string {
  try { return new URL(url).protocol.replace(":", "").toUpperCase(); }
  catch { return "HTTP"; }
}

export function ProxySettings({ initialProxies }: ProxySettingsProps) {
  const [proxies, setProxies] = useState<Proxy[]>(initialProxies);

  const [mode, setMode] = useState<"single" | "bulk">("single");

  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [adding, setAdding] = useState(false);

  const [bulkText, setBulkText] = useState("");
  const [importing, setImporting] = useState(false);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const activeCount = proxies.filter((p) => p.isActive).length;

  const bulkParsed = useMemo(() => {
    const lines = bulkText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const valid = lines.filter(isValidProxyInput);
    const invalid = lines.filter((l) => !isValidProxyInput(l));
    return { valid, invalid, total: lines.length };
  }, [bulkText]);

  const allSelected =
    proxies.length > 0 && proxies.every((p) => selected.has(p.id));
  const someSelected =
    selected.size > 0 && !allSelected;

  function toggleSelectAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(proxies.map((p) => p.id)));
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleAddSingle(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setAdding(true);

    const res = await fetch("/api/proxies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url.trim(), label: label.trim() }),
    });

    if (res.ok) {
      const proxy: Proxy = await res.json();
      setProxies((prev) => [proxy, ...prev]);
      setUrl(""); setLabel("");
      toast.success("Proxy ajouté");
    } else {
      const data = await res.json();
      toast.error(data.error ?? "Erreur lors de l'ajout");
    }
    setAdding(false);
  }

  async function handleImportBulk() {
    if (!bulkParsed.valid.length) return;
    setImporting(true);

    const res = await fetch("/api/proxies/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls: bulkParsed.valid }),
    });

    if (res.ok) {
      const data = await res.json();
      setProxies((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const newOnes = (data.proxies as Proxy[]).filter(
          (p) => !existingIds.has(p.id)
        );
        return [...newOnes, ...prev];
      });
      setBulkText("");
      toast.success(
        `${data.imported} proxy${data.imported > 1 ? "s" : ""} importé${data.imported > 1 ? "s" : ""}` +
        (bulkParsed.invalid.length
          ? ` · ${bulkParsed.invalid.length} ignoré${bulkParsed.invalid.length > 1 ? "s" : ""} (format invalide)`
          : "")
      );
    } else {
      const data = await res.json();
      toast.error(data.error ?? "Erreur lors de l'import");
    }
    setImporting(false);
  }

  async function handleToggle(proxy: Proxy) {
    const res = await fetch(`/api/proxies/${proxy.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !proxy.isActive }),
    });
    if (res.ok) {
      setProxies((prev) =>
        prev.map((p) => p.id === proxy.id ? { ...p, isActive: !p.isActive } : p)
      );
    } else toast.error("Erreur lors de la mise à jour");
  }

  async function handleDeleteOne(proxyId: string) {
    const res = await fetch(`/api/proxies/${proxyId}`, { method: "DELETE" });
    if (res.ok) {
      setProxies((prev) => prev.filter((p) => p.id !== proxyId));
      setSelected((prev) => { const n = new Set(prev); n.delete(proxyId); return n; });
      toast.success("Proxy supprimé");
    } else toast.error("Erreur lors de la suppression");
  }

  async function handleDeleteSelected() {
    if (!selected.size) return;
    setDeleting(true);

    const ids = Array.from(selected);
    const results = await Promise.allSettled(
      ids.map((id) => fetch(`/api/proxies/${id}`, { method: "DELETE" }))
    );

    const succeeded = ids.filter((_, i) => results[i].status === "fulfilled");
    setProxies((prev) => prev.filter((p) => !succeeded.includes(p.id)));
    setSelected(new Set());

    if (succeeded.length === ids.length) {
      toast.success(`${succeeded.length} proxy${succeeded.length > 1 ? "s" : ""} supprimé${succeeded.length > 1 ? "s" : ""}`);
    } else {
      toast.error(`${succeeded.length}/${ids.length} supprimés — des erreurs sont survenues`);
    }
    setDeleting(false);
  }

  return (
    <div className="space-y-6">

      {/* ── En-tête éditorial ──────────────────────────────── */}
      <div className="flex items-end justify-between gap-4 pb-4 border-b border-ink/15">
        <div>
          <span className="eyebrow">Infrastructure</span>
          <h2 className="font-serif text-2xl tracking-tight mt-1">Proxies de rotation</h2>
          <p className="mt-2 text-xs text-ink-3 max-w-lg leading-relaxed">
            Utilisés pour les vérifications Google. Un proxy actif est sélectionné
            aléatoirement à chaque requête.
          </p>
        </div>
        {proxies.length > 0 && (
          <div className="flex items-baseline gap-1.5 shrink-0">
            <span className="figure-display text-3xl text-ink">{activeCount}</span>
            <span className="mono text-[11px] text-ink-3">/ {proxies.length} actifs</span>
          </div>
        )}
      </div>

      {/* ── Formats acceptés — note de bas de page ─────────── */}
      <aside className="flex items-start gap-3 border-l-2 border-ink/30 pl-4 py-1">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-3" />
        <div className="text-xs text-ink-2 space-y-1 font-serif italic">
          <p className="not-italic font-sans eyebrow not-italic">Formats acceptés</p>
          <p className="mono not-italic text-[11px] text-ink-3">host:port</p>
          <p className="mono not-italic text-[11px] text-ink-3">host:port:password</p>
          <p className="mono not-italic text-[11px] text-ink-3">host:port:user:password</p>
          <p className="mono not-italic text-[11px] text-ink-3">http://user:password@host:port</p>
          <p className="mono not-italic text-[11px] text-ink-3">socks5://user:password@host:port</p>
        </div>
      </aside>

      {/* ── Zone d'ajout ─────────────────────────────────── */}
      <div className="sheet overflow-hidden">
        <div className="flex border-b border-ink/15">
          <AddTab active={mode === "single"} onClick={() => setMode("single")} icon={List} label="Un proxy" folio="01" />
          <AddTab active={mode === "bulk"} onClick={() => setMode("bulk")} icon={AlignJustify} label="Import en masse" folio="02" />
        </div>

        <div className="p-5">
          {mode === "single" ? (
            <form onSubmit={handleAddSingle} className="flex gap-2 flex-wrap sm:flex-nowrap">
              <div className="flex-1 min-w-[240px]">
                <label className="eyebrow block mb-1.5">URL</label>
                <input
                  type="text"
                  placeholder="http://user:password@host:port"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  className="w-full border-0 border-b border-ink/25 bg-transparent pb-2 pt-1 mono text-xs text-ink placeholder:text-ink-4 outline-none focus:border-ink transition-colors"
                />
              </div>
              <div className="w-full sm:w-36">
                <label className="eyebrow block mb-1.5">Label</label>
                <input
                  type="text"
                  placeholder="Optionnel"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full border-0 border-b border-ink/25 bg-transparent pb-2 pt-1 text-xs text-ink placeholder:text-ink-4 outline-none focus:border-ink transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={adding || !url.trim()}
                className="btn-ink self-end disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-3.5 w-3.5" />
                Ajouter
              </button>
            </form>
          ) : (
            <div className="space-y-3">
              <label className="eyebrow block">Coller une liste — une ligne par proxy</label>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={"19.24.1.55:12345:monpassword\n1.2.3.4:8080:user:pass\nhttp://user:pass@5.6.7.8:1080\n9.10.11.12:3128\n..."}
                rows={6}
                className="w-full border border-ink/20 rounded-[3px] bg-paper px-3 py-2 mono text-xs text-ink-2 placeholder:text-ink-4 resize-y outline-none focus:border-ink transition-colors"
              />

              {bulkText.trim() && (
                <div className="flex items-center gap-4 text-xs pt-1">
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-signal inline-block" />
                    <span className="mono tabular-nums font-medium text-ink">{bulkParsed.valid.length}</span>
                    <span className="text-ink-3">valide{bulkParsed.valid.length > 1 ? "s" : ""}</span>
                  </span>
                  {bulkParsed.invalid.length > 0 && (
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-rust inline-block" />
                      <span className="mono tabular-nums font-medium text-rust">{bulkParsed.invalid.length}</span>
                      <span className="text-ink-3">invalide{bulkParsed.invalid.length > 1 ? "s" : ""}</span>
                    </span>
                  )}
                  <span className="text-ink-4 mono text-[11px] ml-auto tabular-nums">
                    {bulkParsed.total} ligne{bulkParsed.total > 1 ? "s" : ""}
                  </span>
                </div>
              )}

              <button
                onClick={handleImportBulk}
                disabled={importing || !bulkParsed.valid.length}
                className="btn-ink disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-3.5 w-3.5" />
                {importing
                  ? "Import en cours…"
                  : `Importer ${bulkParsed.valid.length > 0 ? bulkParsed.valid.length + " proxy" + (bulkParsed.valid.length > 1 ? "s" : "") : ""}`}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Liste ─────────────────────────────────────────── */}
      {proxies.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-ink/25 bg-paper-deep/30 py-14 text-center rounded-md">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-paper-deep">
            <Globe className="h-4 w-4 text-ink-3" />
          </div>
          <p className="font-serif text-lg text-ink italic">Aucun proxy configuré</p>
          <p className="mt-1 text-xs text-ink-3">
            Sans proxy, les vérifications Google utilisent l&apos;IP du serveur.
          </p>
        </div>
      ) : (
        <div className="border-t border-b border-ink/20 overflow-hidden">

          {selected.size > 0 && (
            <div className="flex items-center justify-between border-b border-rust/30 bg-rust-soft px-4 py-2.5">
              <span className="text-xs text-rust flex items-baseline gap-1.5">
                <span className="mono tabular-nums font-bold">{selected.size}</span>
                <span>proxy{selected.size > 1 ? "s" : ""} sélectionné{selected.size > 1 ? "s" : ""}</span>
              </span>
              <button
                onClick={handleDeleteSelected}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 rounded-[3px] bg-rust px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-white transition-colors hover:bg-rust/90 disabled:opacity-50"
              >
                <Trash2 className="h-3 w-3" />
                {deleting ? "Suppression…" : `Supprimer (${selected.size})`}
              </button>
            </div>
          )}

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/15">
                <th className="w-10 px-3 py-3">
                  <button onClick={toggleSelectAll} className="flex items-center justify-center text-ink-4 hover:text-ink transition-colors">
                    {allSelected
                      ? <CheckSquare className="h-4 w-4 text-ink" />
                      : someSelected
                        ? <MinusSquare className="h-4 w-4 text-ink-2" />
                        : <Square className="h-4 w-4" />
                    }
                  </button>
                </th>
                <Th>Proxy</Th>
                <Th width="w-24">Protocole</Th>
                <Th width="w-24">Statut</Th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {proxies.map((proxy, i) => {
                const proto = proxyProtocol(proxy.url);
                const isSelected = selected.has(proxy.id);
                return (
                  <tr
                    key={proxy.id}
                    className={cn(
                      "group transition-colors",
                      i !== proxies.length - 1 && "border-b border-ink/10",
                      isSelected ? "bg-paper-deep/60" : "hover:bg-paper-deep/40"
                    )}
                  >
                    <td className="px-3 py-3.5">
                      <button
                        onClick={() => toggleSelect(proxy.id)}
                        className="flex items-center justify-center text-ink-4 hover:text-ink transition-colors"
                      >
                        {isSelected
                          ? <CheckSquare className="h-4 w-4 text-ink" />
                          : <Square className="h-4 w-4" />
                        }
                      </button>
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="space-y-0.5">
                        {proxy.label && (
                          <p className="text-xs font-medium text-ink font-serif italic">{proxy.label}</p>
                        )}
                        <p className="mono text-[11px] text-ink-3">
                          {maskProxyUrl(proxy.url)}
                        </p>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className="inline-flex items-center rounded-[2px] bg-paper-deep px-1.5 py-0.5 mono text-[10px] font-bold text-ink-2">
                        {proto}
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      <button
                        onClick={() => handleToggle(proxy)}
                        className="inline-flex items-center gap-1.5 text-xs transition-opacity hover:opacity-80"
                        title={proxy.isActive ? "Désactiver" : "Activer"}
                      >
                        {proxy.isActive ? (
                          <>
                            <ToggleRight className="h-4 w-4 text-ink" />
                            <span className="chip-signal rounded-[2px] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em]">Actif</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="h-4 w-4 text-ink-4" />
                            <span className="text-ink-4 text-[10px] uppercase tracking-[0.08em]">Inactif</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-3 py-3.5 text-right">
                      <button
                        onClick={() => handleDeleteOne(proxy.id)}
                        className="opacity-0 group-hover:opacity-100 inline-flex h-7 w-7 items-center justify-center rounded-[3px] text-ink-4 transition-all hover:bg-rust-soft hover:text-rust"
                        title="Supprimer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AddTab({
  active,
  onClick,
  icon: Icon,
  label,
  folio,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  folio: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex flex-1 items-center justify-center gap-2 px-4 py-3 text-xs transition-colors",
        active ? "text-ink bg-paper" : "text-ink-3 bg-paper-deep/50 hover:text-ink"
      )}
    >
      <span className={cn("mono text-[10px] tabular-nums", active ? "text-rust" : "text-ink-4")}>
        {folio}
      </span>
      <Icon className="h-3.5 w-3.5" />
      <span className="font-medium uppercase tracking-[0.1em]">{label}</span>
      {active && <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-ink" />}
    </button>
  );
}

function Th({ children, width }: { children: React.ReactNode; width?: string }) {
  return (
    <th className={cn("px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-3", width)}>
      {children}
    </th>
  );
}
