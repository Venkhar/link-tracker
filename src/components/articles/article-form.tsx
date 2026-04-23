"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2, Link2, Target, Type, Euro, Building2, Tag, ArrowLeft, Plus, Save } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormValues {
  articleUrl: string;
  targetUrl: string;
  anchorText: string;
  manualStatus: string;
  prix: string;
  type: string;
  source: string;
}

interface ArticleData {
  id: string;
  articleUrl: string;
  targetUrl: string;
  anchorText: string | null;
  manualStatus: string;
  prix: number | null;
  type: string;
  source: string | null;
}

interface ArticleFormProps {
  campaignId: string;
  article?: ArticleData;
}

const ARTICLE_TYPES = [
  { value: "ARTICLE",    label: "Article",     desc: "Blog / rédactionnel" },
  { value: "FORUM",      label: "Forum",       desc: "Communauté / Q&A"    },
  { value: "COMMUNIQUE", label: "Communiqué",  desc: "Presse / PR"         },
];

export function ArticleForm({ campaignId, article }: ArticleFormProps) {
  const router = useRouter();
  const isEdit = !!article;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      articleUrl: article?.articleUrl ?? "",
      targetUrl:  article?.targetUrl ?? "",
      anchorText: article?.anchorText ?? "",
      manualStatus: article?.manualStatus ?? "PENDING",
      prix: article?.prix != null ? String(article.prix) : "",
      type: article?.type ?? "ARTICLE",
      source: article?.source ?? "",
    },
  });

  const selectedType = watch("type");

  async function onSubmit(data: FormValues) {
    const payload = {
      articleUrl: data.articleUrl,
      targetUrl: data.targetUrl,
      anchorText: data.anchorText,
      manualStatus: data.manualStatus,
      prix: data.prix ? parseFloat(data.prix) : null,
      type: data.type,
      source: data.source,
    };

    const url = isEdit
      ? `/api/campaigns/${campaignId}/articles/${article.id}`
      : `/api/campaigns/${campaignId}/articles`;

    const res = await fetch(url, {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      toast.error(isEdit ? "Erreur lors de la modification" : "Erreur lors de l'ajout");
      return;
    }

    toast.success(isEdit ? "Backlink mis à jour" : "Backlink ajouté avec succès");
    router.push(`/campaigns/${campaignId}`);
    router.refresh();
  }

  const monoInputClass = (hasError: boolean) =>
    cn(
      "w-full border-0 border-b border-ink/25 bg-transparent pb-2 pt-1 mono text-sm text-ink placeholder:text-ink-4 outline-none transition-colors focus:border-ink",
      hasError && "border-rust focus:border-rust"
    );

  const textInputClass = (hasError?: boolean) =>
    cn(
      "w-full border-0 border-b border-ink/25 bg-transparent pb-2 pt-1 text-sm text-ink placeholder:text-ink-4 outline-none transition-colors focus:border-ink",
      hasError && "border-rust focus:border-rust"
    );

  return (
    <div className="mx-auto max-w-2xl space-y-8">

      {/* Back + editorial header */}
      <section className="border-b border-ink/20 pb-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-4 inline-flex items-center gap-1.5 eyebrow hover:text-ink transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Retour à la campagne
        </button>
        <h1 className="font-serif text-[40px] leading-[0.95] tracking-tightest">
          {isEdit ? "Modifier le backlink" : (
            <>Nouveau <span className="italic font-light">backlink</span></>
          )}
        </h1>
        <p className="mt-3 text-sm text-ink-3 max-w-xl">
          {isEdit ? "Mettez à jour les informations du lien." : "Renseignez les informations du lien à surveiller."}
        </p>
      </section>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">

        {/* ── Section 01 : Identification ──────────────────── */}
        <Section number="01" title="Identification du lien" accent>
          <FieldGroup>

            <Field
              label={<span className="flex items-center gap-1.5"><Link2 className="h-3.5 w-3.5 text-ink-3" />URL de l&apos;article</span>}
              required
              error={errors.articleUrl?.message}
            >
              <input
                id="articleUrl"
                {...register("articleUrl", { required: "L'URL de l'article est requise" })}
                placeholder="https://blog.partenaire.com/mon-article"
                className={monoInputClass(!!errors.articleUrl)}
              />
            </Field>

            <Field
              label={<span className="flex items-center gap-1.5"><Target className="h-3.5 w-3.5 text-ink-3" />URL cible du backlink</span>}
              required
              error={errors.targetUrl?.message}
            >
              <input
                id="targetUrl"
                {...register("targetUrl", { required: "L'URL cible est requise" })}
                placeholder="https://monsite.com/ma-page"
                className={monoInputClass(!!errors.targetUrl)}
              />
            </Field>

            <Field
              label={
                <span className="flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-ink-3" />
                  Texte d&apos;ancre
                  <span className="ml-auto mono text-[10px] text-ink-4 normal-case tracking-normal">optionnel</span>
                </span>
              }
            >
              <input
                id="anchorText"
                {...register("anchorText")}
                placeholder="Ex : meilleur outil SEO"
                className={textInputClass()}
              />
            </Field>

          </FieldGroup>
        </Section>

        {/* ── Section 02 : Métadonnées ─────────────────────── */}
        <Section number="02" title="Métadonnées" note="Tout optionnel">
          <FieldGroup>

            <Field
              label={<span className="flex items-center gap-1.5"><Type className="h-3.5 w-3.5 text-ink-3" />Type de lien</span>}
            >
              <div className="grid grid-cols-3 gap-2">
                {ARTICLE_TYPES.map((t) => {
                  const active = selectedType === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setValue("type", t.value)}
                      className={cn(
                        "flex flex-col items-start rounded-[3px] border px-3.5 py-3 text-left transition-all",
                        active
                          ? "border-ink bg-ink text-paper"
                          : "border-ink/20 bg-transparent text-ink hover:border-ink/40 hover:bg-paper-deep/40"
                      )}
                    >
                      <span className="text-sm font-medium leading-none">
                        {t.label}
                      </span>
                      <span className={cn(
                        "mt-1.5 text-[11px] font-serif italic leading-tight",
                        active ? "text-paper/60" : "text-ink-3"
                      )}>
                        {t.desc}
                      </span>
                      {active && (
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-signal self-end" />
                      )}
                    </button>
                  );
                })}
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-6">
              <Field label={<span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-ink-3" />Plateforme / Source</span>}>
                <input
                  id="source"
                  {...register("source")}
                  placeholder="SEMJuice, Rédac web…"
                  className={textInputClass()}
                />
              </Field>

              <Field label={<span className="flex items-center gap-1.5"><Euro className="h-3.5 w-3.5 text-ink-3" />Prix</span>}>
                <div className="relative">
                  <input
                    id="prix"
                    type="number"
                    step="0.01"
                    min="0"
                    {...register("prix")}
                    placeholder="0.00"
                    className={cn(monoInputClass(false), "pr-6")}
                  />
                  <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-xs text-ink-3 mono">
                    €
                  </span>
                </div>
              </Field>
            </div>

          </FieldGroup>
        </Section>

        {/* ── Footer ───────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center rounded-[3px] border border-ink/20 bg-transparent px-3.5 py-2 text-xs font-medium uppercase tracking-[0.12em] text-ink hover:bg-ink/5 transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-ink disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {isEdit ? "Enregistrement…" : "Ajout en cours…"}
              </>
            ) : isEdit ? (
              <>
                <Save className="h-3.5 w-3.5" />
                Enregistrer
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" />
                Ajouter le backlink
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

function Section({
  number,
  title,
  note,
  accent,
  children,
}: {
  number: string;
  title: string;
  note?: string;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="sheet overflow-hidden relative">
      {accent && <div className="absolute inset-y-0 left-0 w-[2px] bg-signal" />}
      <div className="px-6 pt-5 pb-6">
        <div className="mb-5 flex items-center gap-3 pb-3 border-b border-ink/10">
          <span className="mono text-[11px] text-rust tabular-nums font-semibold">§{number}</span>
          <h2 className="font-serif text-lg tracking-tight">{title}</h2>
          {note && <span className="ml-auto mono text-[10px] text-ink-4 italic font-serif">— {note}</span>}
        </div>
        {children}
      </div>
    </div>
  );
}

function FieldGroup({ children }: { children: React.ReactNode }) {
  return <div className="space-y-5">{children}</div>;
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: React.ReactNode;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="eyebrow flex items-center">
        {label}
        {required && <span className="text-rust ml-1 normal-case">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-[11px] text-rust italic font-serif">{error}</p>
      )}
    </div>
  );
}
