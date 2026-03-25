"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 border-b px-6 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 shrink-0">
          <Lock className="h-4 w-4 text-indigo-500" />
        </div>
        <h2 className="text-sm font-semibold text-gray-900">Changer le mot de passe</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="divide-y">

        {/* Mot de passe actuel */}
        <div className="px-6 py-4 space-y-1.5">
          <Label htmlFor="currentPassword" className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Mot de passe actuel
          </Label>
          <div className="relative">
            <Input
              id="currentPassword"
              type={showCurrent ? "text" : "password"}
              autoComplete="current-password"
              {...register("currentPassword", { required: "Requis" })}
              className={cn("h-10 pr-9", errors.currentPassword && "border-red-300 focus-visible:border-red-400")}
            />
            <button
              type="button"
              onClick={() => setShowCurrent((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              tabIndex={-1}
            >
              {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.currentPassword && (
            <p className="text-xs text-red-500">{errors.currentPassword.message}</p>
          )}
        </div>

        {/* Nouveau mot de passe */}
        <div className="px-6 py-4 space-y-1.5">
          <Label htmlFor="newPassword" className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Nouveau mot de passe
          </Label>
          <div className="relative">
            <Input
              id="newPassword"
              type={showNew ? "text" : "password"}
              autoComplete="new-password"
              {...register("newPassword", {
                required: "Requis",
                minLength: { value: 8, message: "Minimum 8 caractères" },
              })}
              className={cn("h-10 pr-9", errors.newPassword && "border-red-300 focus-visible:border-red-400")}
            />
            <button
              type="button"
              onClick={() => setShowNew((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              tabIndex={-1}
            >
              {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.newPassword ? (
            <p className="text-xs text-red-500">{errors.newPassword.message}</p>
          ) : (
            <p className="text-xs text-gray-400">Minimum 8 caractères</p>
          )}
        </div>

        {/* Confirmation */}
        <div className="px-6 py-4 space-y-1.5">
          <Label htmlFor="confirmPassword" className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Confirmer le nouveau mot de passe
          </Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            {...register("confirmPassword", {
              required: "Requis",
              validate: (v) => v === newPassword || "Les mots de passe ne correspondent pas",
            })}
            className={cn("h-10", errors.confirmPassword && "border-red-300 focus-visible:border-red-400")}
          />
          {errors.confirmPassword && (
            <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end px-6 py-4 bg-gray-50">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-60"
          >
            {isSubmitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Enregistrement…</>
            ) : (
              <><Lock className="h-4 w-4" /> Mettre à jour</>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}
