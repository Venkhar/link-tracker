"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormValues {
  name: string;
  description: string;
  targetDomain: string;
  plateforme: string;
  status: string;
  checkFrequency: string;
}

interface CampaignFormProps {
  defaultValues?: Partial<FormValues> & { id?: string };
  isEditing?: boolean;
}

export function CampaignForm({ defaultValues, isEditing = false }: CampaignFormProps) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      name: defaultValues?.name ?? "",
      description: defaultValues?.description ?? "",
      targetDomain: defaultValues?.targetDomain ?? "",
      plateforme: defaultValues?.plateforme ?? "",
      status: defaultValues?.status ?? "ACTIVE",
      checkFrequency: defaultValues?.checkFrequency ?? "WEEKLY",
    },
  });

  const status = watch("status");
  const checkFrequency = watch("checkFrequency");

  async function onSubmit(data: FormValues) {
    const url = isEditing ? `/api/campaigns/${defaultValues?.id}` : "/api/campaigns";
    const method = isEditing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error?.formErrors?.[0] || "Erreur lors de la sauvegarde");
      return;
    }

    const campaign = await res.json();
    toast.success(isEditing ? "Campagne mise à jour" : "Campagne créée");
    router.push(`/campaigns/${campaign.id}`);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Editorial header */}
      <section className="border-b border-ink/20 pb-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="eyebrow">{isEditing ? "Modification" : "Création"}</span>
          <span className="h-px flex-1 bg-ink/15" />
        </div>
        <h1 className="font-serif text-[40px] leading-[0.95] tracking-tightest">
          {isEditing ? "Modifier la campagne" : (
            <>Nouvelle <span className="italic font-light">campagne</span></>
          )}
        </h1>
        <p className="mt-3 text-sm text-ink-3 max-w-xl">
          {isEditing
            ? "Modifiez les informations de votre campagne."
            : "Renseignez les informations de votre nouvelle campagne de backlinks."}
        </p>
      </section>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="sheet overflow-hidden">
        <div className="px-6 py-6 space-y-6 divide-y divide-ink/10">

          <Field
            label="Nom de la campagne"
            required
            error={errors.name?.message}
          >
            <UnderlineInput
              id="name"
              placeholder="Ex : Campagne SEO Printemps 2026"
              {...register("name", { required: "Le nom est requis" })}
              error={!!errors.name}
            />
          </Field>

          <div className="pt-6">
            <Field label="Description">
              <textarea
                id="description"
                {...register("description")}
                placeholder="Décrivez l'objectif de cette campagne..."
                rows={3}
                className="w-full border border-ink/20 rounded-[3px] bg-transparent px-3 py-2 text-sm text-ink placeholder:text-ink-4 resize-none outline-none focus:border-ink transition-colors font-serif italic"
              />
            </Field>
          </div>

          <div className="pt-6">
            <Field
              label="Domaine cible"
              required
              error={errors.targetDomain?.message}
            >
              <UnderlineInput
                id="targetDomain"
                placeholder="ex : www.monsite.com"
                {...register("targetDomain", { required: "Le domaine cible est requis" })}
                error={!!errors.targetDomain}
                mono
              />
            </Field>
          </div>

          <div className="pt-6">
            <Field
              label={
                <span className="flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 text-ink-3" />
                  <span>Plateforme</span>
                  <span className="ml-auto mono text-[10px] text-ink-4 normal-case tracking-normal">optionnel</span>
                </span>
              }
            >
              <UnderlineInput
                id="plateforme"
                placeholder="Ex : SEMJuice, Getfluence, Rédac web…"
                {...register("plateforme")}
              />
            </Field>
          </div>

          <div className="pt-6 grid gap-6 sm:grid-cols-2">
            <Field label="Statut">
              <SegmentedSelect
                value={status}
                onChange={(v) => setValue("status", v)}
                options={[
                  { value: "ACTIVE",    label: "Active",   dot: "bg-signal" },
                  { value: "PAUSED",    label: "Pause",    dot: "bg-ochre" },
                  { value: "COMPLETED", label: "Terminée", dot: "bg-ink-4" },
                ]}
              />
            </Field>

            <Field label="Fréquence de vérification">
              <SegmentedSelect
                value={checkFrequency}
                onChange={(v) => setValue("checkFrequency", v)}
                options={[
                  { value: "DAILY",   label: "Jour" },
                  { value: "WEEKLY",  label: "Semaine" },
                  { value: "MONTHLY", label: "Mois" },
                ]}
              />
            </Field>
          </div>

        </div>

        <div className="flex items-center justify-end gap-3 border-t border-ink/10 bg-paper-deep/40 px-6 py-4">
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
                Sauvegarde…
              </>
            ) : isEditing ? (
              "Mettre à jour"
            ) : (
              "Créer la campagne"
            )}
          </button>
        </div>
      </form>
    </div>
  );
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
      <label className="eyebrow block">
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

const UnderlineInput = ({
  error,
  mono,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean; mono?: boolean }) => (
  <input
    {...props}
    className={cn(
      "w-full border-0 border-b border-ink/25 bg-transparent pb-2 pt-1 text-sm text-ink outline-none transition-colors focus:border-ink placeholder:text-ink-4",
      mono && "mono text-xs",
      error && "border-rust focus:border-rust",
      className
    )}
  />
);

function SegmentedSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; dot?: string }[];
}) {
  return (
    <div className="inline-flex border border-ink/20 rounded-[3px] overflow-hidden w-full">
      {options.map((opt, i) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs transition-colors",
              active ? "bg-ink text-paper" : "bg-transparent text-ink-3 hover:bg-paper-deep/60 hover:text-ink",
              i !== options.length - 1 && "border-r border-ink/20"
            )}
          >
            {opt.dot && (
              <span className={cn("h-1.5 w-1.5 rounded-full", opt.dot)} />
            )}
            <span className="uppercase tracking-[0.08em] font-medium">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
