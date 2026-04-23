"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export function ChangePasswordForm() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>();

  const newPassword = watch("newPassword", "");

  async function onSubmit(data: FormValues) {
    const res = await fetch("/api/users/me/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      toast.error(json.error || "Erreur lors du changement de mot de passe");
      return;
    }

    toast.success("Mot de passe mis à jour");
    reset();
  }

  const inputClass = (hasError: boolean) =>
    cn(
      "h-10 w-full border-0 border-b border-ink/25 bg-transparent pb-2 pt-1 text-sm text-ink mono outline-none transition-colors focus:border-ink placeholder:text-ink-4",
      hasError && "border-rust focus:border-rust"
    );

  return (
    <div className="sheet overflow-hidden">
      <div className="flex items-center justify-between border-b border-ink/15 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <Lock className="h-4 w-4 text-ink-2" />
          <span className="eyebrow">Changer le mot de passe</span>
        </div>
        <span className="mono text-[10px] text-ink-4">//</span>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>

        <div className="px-6 py-5 space-y-5 divide-y divide-ink/10">
          <Field label="Mot de passe actuel" error={errors.currentPassword?.message}>
            <div className="relative">
              <input
                id="currentPassword"
                type={showCurrent ? "text" : "password"}
                autoComplete="current-password"
                {...register("currentPassword", { required: "Requis" })}
                className={inputClass(!!errors.currentPassword)}
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-0 top-1/2 -translate-y-1/2 text-ink-4 hover:text-ink transition-colors"
                tabIndex={-1}
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>

          <div className="pt-5">
            <Field
              label="Nouveau mot de passe"
              error={errors.newPassword?.message}
              help="Minimum 8 caractères"
            >
              <div className="relative">
                <input
                  id="newPassword"
                  type={showNew ? "text" : "password"}
                  autoComplete="new-password"
                  {...register("newPassword", {
                    required: "Requis",
                    minLength: { value: 8, message: "Minimum 8 caractères" },
                  })}
                  className={inputClass(!!errors.newPassword)}
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-ink-4 hover:text-ink transition-colors"
                  tabIndex={-1}
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>
          </div>

          <div className="pt-5">
            <Field label="Confirmer le nouveau mot de passe" error={errors.confirmPassword?.message}>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                {...register("confirmPassword", {
                  required: "Requis",
                  validate: (v) => v === newPassword || "Les mots de passe ne correspondent pas",
                })}
                className={inputClass(!!errors.confirmPassword)}
              />
            </Field>
          </div>
        </div>

        <div className="flex justify-end px-6 py-4 bg-paper-deep/40 border-t border-ink/10">
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-ink disabled:opacity-60"
          >
            {isSubmitting ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Enregistrement…</>
            ) : (
              <><Lock className="h-3.5 w-3.5" /> Mettre à jour</>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}

function Field({
  label,
  error,
  help,
  children,
}: {
  label: string;
  error?: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="eyebrow block">{label}</label>
      {children}
      {error ? (
        <p className="text-[11px] text-rust italic font-serif">{error}</p>
      ) : help ? (
        <p className="text-[11px] text-ink-4">{help}</p>
      ) : null}
    </div>
  );
}
