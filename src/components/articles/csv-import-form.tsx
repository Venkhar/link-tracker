"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, FileText, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImportResult {
  imported: number;
  total: number;
  errors: { row: number; message: string }[];
}

export function CsvImportForm({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragging, setDragging] = useState(false);

  async function handleImport() {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`/api/campaigns/${campaignId}/articles/import`, {
      method: "POST",
      body: formData,
    });

    setLoading(false);

    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error || "Erreur lors de l'import");
      return;
    }

    const data: ImportResult = await res.json();
    setResult(data);
    if (data.imported > 0) toast.success(`${data.imported} articles importés`);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.name.endsWith(".csv")) {
      setFile(dropped);
      setResult(null);
    } else {
      toast.error("Veuillez déposer un fichier CSV");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">

      <section className="border-b border-ink/20 pb-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="eyebrow">Import groupé</span>
          <span className="h-px flex-1 bg-ink/15" />
          <span className="mono text-[10px] text-ink-4 uppercase tracking-wider">CSV · max 500 lignes</span>
        </div>
        <h1 className="font-serif text-[40px] leading-[0.95] tracking-tightest">
          Importer via <span className="italic font-light">CSV</span>
        </h1>
        <p className="mt-3 text-sm text-ink-3 max-w-xl">
          Importez jusqu&apos;à 500 articles en une seule fois depuis un fichier CSV.
        </p>
      </section>

      <div className="sheet">
        <div className="p-6 space-y-5">

          <label
            htmlFor="csv-file"
            className={cn(
              "flex flex-col items-center justify-center border border-dashed p-10 cursor-pointer transition-colors rounded-md",
              dragging
                ? "border-ink bg-paper-deep/60"
                : "border-ink/25 bg-paper-deep/30 hover:border-ink/50 hover:bg-paper-deep/50"
            )}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-paper mb-3">
              <Upload className="h-4 w-4" />
            </div>
            <p className="text-sm text-ink">
              Glissez votre fichier ici ou{" "}
              <span className="underline decoration-ink/30 decoration-[1.5px] underline-offset-[3px] hover:decoration-ink">parcourez</span>
            </p>
            <p className="mt-2 mono text-[10px] text-ink-4 uppercase tracking-[0.12em]">
              .csv uniquement
            </p>
            <input
              id="csv-file"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setResult(null);
              }}
            />
          </label>

          {/* Format info */}
          <div className="border-l-2 border-ink/30 pl-4 py-1">
            <p className="eyebrow mb-2">Colonnes attendues</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mono text-[11px] text-ink-2">
              <span><span className="text-rust">article_url</span> — URL de l&apos;article</span>
              <span><span className="text-rust">target_url</span> — URL cible du backlink</span>
              <span><span className="text-rust">anchor_text</span> — Ancre <span className="text-ink-4 italic font-serif normal-case">(opt.)</span></span>
              <span><span className="text-rust">source</span> — Plateforme <span className="text-ink-4 italic font-serif normal-case">(opt.)</span></span>
              <span><span className="text-rust">type</span> — ARTICLE / FORUM / COMMUNIQUE <span className="text-ink-4 italic font-serif normal-case">(opt.)</span></span>
              <span><span className="text-rust">prix</span> — Prix en euros <span className="text-ink-4 italic font-serif normal-case">(opt.)</span></span>
              <span><span className="text-rust">status</span> — Statut initial <span className="text-ink-4 italic font-serif normal-case">(opt.)</span></span>
            </div>
          </div>

          {file && (
            <div className="flex items-center gap-3 border border-ink/20 bg-paper px-4 py-3 rounded-[3px]">
              <div className="flex h-9 w-9 items-center justify-center rounded-[3px] bg-paper-deep">
                <FileText className="h-4 w-4 text-ink-2" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="mono text-sm text-ink truncate">{file.name}</p>
                <p className="mono text-[10px] text-ink-4 tabular-nums">{(file.size / 1024).toFixed(1)} Ko</p>
              </div>
              <button
                type="button"
                onClick={() => { setFile(null); setResult(null); }}
                className="eyebrow text-ink-3 hover:text-rust transition-colors"
              >
                Retirer
              </button>
            </div>
          )}

          {result && (
            <div className="border border-ink/20 overflow-hidden rounded-[3px]">
              <div className="flex items-center gap-3 chip-signal px-4 py-3 border-b border-ink/15">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span className="text-xs">
                  <span className="mono tabular-nums font-bold">{result.imported} / {result.total}</span>
                  <span className="ml-2 uppercase tracking-[0.08em] text-[11px]">articles importés</span>
                </span>
              </div>
              {result.errors.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-rust-soft border-b border-ink/15">
                    <XCircle className="h-4 w-4 text-rust shrink-0" />
                    <span className="text-xs text-rust">
                      <span className="mono tabular-nums font-bold">{result.errors.length}</span>
                      <span className="ml-2 uppercase tracking-[0.08em] text-[11px]">erreur{result.errors.length > 1 ? "s" : ""}</span>
                    </span>
                  </div>
                  <div className="max-h-40 overflow-y-auto divide-y divide-ink/10">
                    {result.errors.map((err, i) => (
                      <div key={i} className="px-4 py-2 text-xs text-rust bg-paper">
                        <span className="mono tabular-nums font-semibold">Ligne {err.row}</span> — {err.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-ink/10 bg-paper-deep/40 px-6 py-4">
          <button
            onClick={() => router.push(`/campaigns/${campaignId}`)}
            className="inline-flex items-center rounded-[3px] border border-ink/20 bg-transparent px-3.5 py-2 text-xs font-medium uppercase tracking-[0.12em] text-ink hover:bg-ink/5 transition-colors"
          >
            Retour
          </button>
          <button
            onClick={handleImport}
            disabled={!file || loading}
            className="btn-ink disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Import en cours…
              </>
            ) : (
              <>
                <Upload className="h-3.5 w-3.5" />
                Importer
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
