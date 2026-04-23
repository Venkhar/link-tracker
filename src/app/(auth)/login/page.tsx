"use client";

import { Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowRight } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const callbackUrl = searchParams.get("callbackUrl") || "/";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    setLoading(false);

    if (result?.error) {
      setError("Email ou mot de passe incorrect");
    } else if (result?.url) {
      router.push(result.url);
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 fade-up">
      {error && (
        <div className="border-l-2 border-rust bg-rust-soft/60 px-4 py-3 text-sm text-rust font-serif italic">
          {error}
        </div>
      )}
      <div className="space-y-2">
        <label htmlFor="email" className="eyebrow block">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="admin@linktracker.local"
          required
          autoComplete="email"
          className="w-full border-0 border-b border-ink/30 bg-transparent pb-2.5 pt-1 text-[15px] text-ink mono outline-none transition-colors focus:border-ink placeholder:text-ink-4"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="password" className="eyebrow block">Mot de passe</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full border-0 border-b border-ink/30 bg-transparent pb-2.5 pt-1 text-[15px] text-ink mono outline-none transition-colors focus:border-ink placeholder:text-ink-4"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="group mt-4 inline-flex w-full items-center justify-between gap-3 rounded-[3px] bg-ink px-5 py-3.5 text-xs font-medium uppercase tracking-[0.15em] text-paper transition-all hover:bg-ink/85 active:translate-y-px disabled:opacity-60"
      >
        <span>{loading ? "Connexion en cours…" : "Entrer dans l'observatoire"}</span>
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-paper grid md:grid-cols-2 relative overflow-hidden">
      {/* Left panel — editorial hero */}
      <aside className="relative hidden md:flex flex-col justify-between bg-ink text-paper p-10 lg:p-14 overflow-hidden">
        {/* Decorative folio grid */}
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="1.5" cy="1.5" r="1" fill="currentColor" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
        </div>

        {/* Top: masthead */}
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="eyebrow text-paper/60">Édition No.IV</span>
            <span className="h-px w-8 bg-paper/30" />
            <span className="mono text-[10px] text-paper/50 uppercase tracking-wider">MMXXVI</span>
          </div>
          <h1 className="mt-8 font-serif text-[64px] lg:text-[96px] leading-[0.88] tracking-tightest">
            Link<span className="italic text-signal block lg:inline">tracker</span>
          </h1>
          <p className="mt-6 max-w-sm font-serif text-[17px] italic text-paper/70 leading-snug">
            L&apos;observatoire éditorial des backlinks SEO — où chaque lien devient un témoin archivé.
          </p>
        </div>

        {/* Middle: decorative figure */}
        <div className="relative flex items-end justify-between mt-10">
          <div className="flex items-end gap-6">
            <div>
              <div className="eyebrow text-paper/50">Parc surveillé</div>
              <div className="figure-display text-[88px] text-paper leading-none mt-1">
                ∞
              </div>
            </div>
            <div className="pb-3 max-w-[140px]">
              <div className="eyebrow text-signal">Signal vital</div>
              <div className="text-[11px] text-paper/55 leading-snug mt-1">
                Vérification quotidienne des backlinks et de l&apos;indexation.
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: colophon */}
        <div className="relative border-t border-paper/15 pt-6 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-paper/50">
          <span>Hellowork · Équipe SEO</span>
          <span className="mono">v1.0</span>
        </div>
      </aside>

      {/* Right panel — form */}
      <main className="flex items-center justify-center p-8 md:p-14 relative">
        <div className="w-full max-w-sm">
          <div className="mb-10">
            <span className="eyebrow">Accès privé</span>
            <h2 className="font-serif text-[38px] tracking-tightest mt-3 leading-[1]">
              Se connecter.
            </h2>
            <p className="text-sm text-ink-3 mt-3 leading-relaxed">
              Entrez vos identifiants pour consulter les campagnes de backlinks.
            </p>
          </div>

          <Suspense>
            <LoginForm />
          </Suspense>

          <p className="mt-10 text-[11px] text-ink-4 uppercase tracking-[0.18em] text-center">
            <span className="mono">——</span>  Propriété éditoriale Hellowork  <span className="mono">——</span>
          </p>
        </div>
      </main>
    </div>
  );
}
