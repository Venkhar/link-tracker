import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { LogsSettings } from "@/components/settings/logs-settings";

export default async function LogsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <section className="border-b border-ink/20 pb-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="eyebrow">Archives</span>
          <span className="h-px flex-1 bg-ink/15" />
          <span className="mono text-[10px] text-ink-4 uppercase tracking-wider">Lecture seule</span>
        </div>
        <h1 className="font-serif text-[48px] leading-[0.95] tracking-tightest">
          Journal <span className="italic font-light">des vérifications</span>
        </h1>
        <p className="text-sm text-ink-3 mt-3 max-w-xl">
          Historique des actions et vérifications effectuées par l&apos;outil — chaque ligne est un témoin horodaté.
        </p>
      </section>

      <LogsSettings />
    </div>
  );
}
