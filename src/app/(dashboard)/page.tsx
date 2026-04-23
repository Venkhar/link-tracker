import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [allArticles, campaignCount, recentArticles] = await Promise.all([
    prisma.article.findMany({
      select: {
        id: true,
        createdAt: true,
        backlinkChecks: {
          orderBy: { checkedAt: "desc" },
          take: 1,
          select: { status: true, isDofollow: true },
        },
        indexationChecks: {
          orderBy: { checkedAt: "desc" },
          take: 1,
          select: { status: true },
        },
      },
    }),
    prisma.campaign.count({ where: { status: "ACTIVE" } }),
    prisma.article.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        articleUrl: true,
        campaignId: true,
        campaign: { select: { name: true, id: true } },
        backlinkChecks: {
          orderBy: { checkedAt: "desc" },
          take: 1,
          select: { status: true, isDofollow: true },
        },
        indexationChecks: {
          orderBy: { checkedAt: "desc" },
          take: 1,
          select: { status: true },
        },
      },
    }),
  ]);

  const total    = allArticles.length;
  const actifs   = allArticles.filter((a) => a.backlinkChecks[0]?.status === "FOUND").length;
  const dofollow = allArticles.filter((a) => a.backlinkChecks[0]?.status === "FOUND" && a.backlinkChecks[0]?.isDofollow === true).length;
  const nofollow = allArticles.filter((a) => a.backlinkChecks[0]?.status === "FOUND" && a.backlinkChecks[0]?.isDofollow === false).length;
  const indexed  = allArticles.filter((a) => a.indexationChecks[0]?.status === "INDEXED").length;

  const ceMois    = allArticles.filter((a) => a.createdAt >= startOfThisMonth).length;
  const lastMois  = allArticles.filter((a) => a.createdAt >= startOfLastMonth && a.createdAt < startOfThisMonth).length;
  const growth    = lastMois > 0 ? Math.round(((ceMois - lastMois) / lastMois) * 100) : 0;

  const actifsPercent   = total > 0 ? Math.round((actifs / total) * 100) : 0;
  const indexedPercent  = total > 0 ? Math.round((indexed / total) * 100) : 0;

  const kpis = [
    { label: "Actifs",   value: actifs,   foot: `${actifsPercent}% du parc` },
    { label: "Dofollow", value: dofollow, foot: `${actifs > 0 ? Math.round((dofollow / actifs) * 100) : 0}% des actifs` },
    { label: "Nofollow", value: nofollow, foot: `${actifs > 0 ? Math.round((nofollow / actifs) * 100) : 0}% des actifs` },
    { label: "Indexés",  value: indexed,  foot: `${indexedPercent}% du parc` },
  ];

  const firstName = session.user.name?.split(" ")[0] ?? "";

  return (
    <div className="space-y-12">
      {/* === HERO: masthead éditorial === */}
      <section className="grid grid-cols-12 gap-6 border-b border-ink/20 pb-10">
        {/* Left column: greeting + context */}
        <div className="col-span-12 lg:col-span-7 flex flex-col justify-between">
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <span className="eyebrow">Édito du jour</span>
              <span className="h-px flex-1 bg-ink/15" />
              <span className="mono text-[10px] text-ink-4 uppercase tracking-wider">
                {now.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
              </span>
            </div>
            <h1 className="font-serif text-[56px] md:text-[72px] leading-[0.92] tracking-tightest text-ink">
              Bonjour, <span className="italic font-light">{firstName}</span>.
            </h1>
            <p className="max-w-xl text-[15px] leading-relaxed text-ink-2">
              L&apos;observatoire a veillé pendant votre absence.
              Voici le dernier état des <span className="font-medium">{total}</span> backlinks sous surveillance,
              répartis entre <span className="font-medium">{campaignCount}</span> campagne{campaignCount > 1 ? "s" : ""} actives.
            </p>
          </div>
          <div className="mt-10 flex flex-wrap gap-2">
            <Link href="/campaigns" className="btn-ink">
              Parcourir les campagnes
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/logs"
              className="inline-flex items-center gap-2 rounded-[3px] border border-ink/20 bg-transparent px-3.5 py-2 text-xs font-medium uppercase tracking-[0.12em] text-ink hover:bg-ink/5 transition-colors"
            >
              Voir les logs
            </Link>
          </div>
        </div>

        {/* Right column: big figure */}
        <aside className="col-span-12 lg:col-span-5 relative">
          <div className="sheet bg-ink text-paper p-7 flex flex-col h-full relative overflow-hidden">
            {/* signal highlighter band */}
            <div className="absolute top-0 right-0 h-[56%] w-1 bg-signal" />
            <div className="flex items-center justify-between">
              <span className="eyebrow text-paper/60">Parc total</span>
              <span className="mono text-[10px] text-paper/50">backlinks</span>
            </div>
            <div className="flex items-end justify-between mt-2 gap-4">
              <span className="figure-display text-[120px] md:text-[150px] text-paper">
                {total}
              </span>
              <div className="pb-6">
                <div className="flex items-center gap-1 text-signal text-sm font-medium">
                  {growth >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                  <span className="tabular-nums">{growth >= 0 ? "+" : ""}{growth}%</span>
                </div>
                <div className="text-[10px] text-paper/50 uppercase tracking-wider mt-0.5">vs mois dernier</div>
              </div>
            </div>
            <div className="hairline border-paper/15 mt-5 pt-5 grid grid-cols-2 gap-5 text-sm">
              <div>
                <div className="eyebrow text-paper/60">Ce mois</div>
                <div className="figure-display text-[26px] text-paper mt-1">+{ceMois}</div>
              </div>
              <div>
                <div className="eyebrow text-paper/60">Campagnes</div>
                <div className="figure-display text-[26px] text-paper mt-1">{campaignCount}</div>
              </div>
            </div>
          </div>
        </aside>
      </section>

      {/* === KPIs — ligne éditoriale avec hairlines === */}
      <section>
        <div className="flex items-baseline justify-between mb-5">
          <div>
            <span className="eyebrow">Indicateurs</span>
            <h2 className="font-serif text-2xl tracking-tight mt-1">Signes vitaux du parc</h2>
          </div>
          <span className="mono text-[11px] text-ink-4 tabular-nums">/04</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 border-t border-b border-ink/20 divide-x divide-ink/15">
          {kpis.map(({ label, value, foot }, i) => (
            <div key={label} className="px-5 py-6 relative flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="eyebrow">{label}</span>
                <span className="mono text-[10px] text-ink-4 tabular-nums">0{i + 1}</span>
              </div>
              <div className="figure-display text-[52px] md:text-[68px] text-ink">{value}</div>
              <div className="text-[11px] text-ink-3">{foot}</div>
            </div>
          ))}
        </div>
      </section>

      {/* === Derniers backlinks — colonne éditoriale === */}
      <section className="grid grid-cols-12 gap-6">
        <aside className="col-span-12 md:col-span-3">
          <span className="eyebrow">Chronique</span>
          <h2 className="font-serif text-2xl tracking-tight mt-1">Derniers ajouts</h2>
          <p className="text-sm text-ink-3 mt-3 leading-relaxed">
            Les six backlinks les plus récemment enregistrés dans l&apos;observatoire.
            Cliquez sur une URL pour l&apos;ouvrir, ou sur la campagne pour le contexte.
          </p>
        </aside>

        <div className="col-span-12 md:col-span-9 border-t border-b border-ink/20">
          {recentArticles.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-ink-3 font-serif italic">Aucun backlink enregistré.</p>
            </div>
          ) : (
            <ul className="divide-y divide-ink/10">
              {recentArticles.map((article, i) => {
                const lastCheck = article.backlinkChecks[0];
                const lastIdx   = article.indexationChecks[0];
                let hostname = article.articleUrl;
                try { hostname = new URL(article.articleUrl).hostname.replace(/^www\./, ""); } catch { /* noop */ }

                return (
                  <li key={article.id} className="group flex items-center gap-4 py-4 px-1 hover:bg-paper-deep/40 transition-colors">
                    <span className="mono text-[10px] text-ink-4 tabular-nums w-6 shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <a
                        href={article.articleUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mono text-[13px] text-ink hover:text-rust transition-colors truncate inline-block max-w-full"
                      >
                        {hostname}
                      </a>
                      <div className="mt-0.5">
                        <Link
                          href={`/campaigns/${article.campaign.id}`}
                          className="text-[11px] text-ink-3 hover:text-ink transition-colors italic font-serif"
                        >
                          {article.campaign.name}
                        </Link>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {lastCheck ? (
                        <StatusChip
                          variant={lastCheck.status === "FOUND" ? "signal" : "rust"}
                          label={lastCheck.status === "FOUND" ? "Actif" : "Inactif"}
                        />
                      ) : (
                        <StatusChip variant="muted" label="—" />
                      )}
                      {lastCheck?.status === "FOUND" && lastCheck.isDofollow !== null && (
                        <StatusChip
                          variant={lastCheck.isDofollow ? "signal" : "muted"}
                          label={lastCheck.isDofollow ? "dofollow" : "nofollow"}
                        />
                      )}
                      {lastIdx ? (
                        <StatusChip
                          variant={lastIdx.status === "INDEXED" ? "azure" : lastIdx.status === "UNKNOWN" ? "ochre" : "rust"}
                          label={lastIdx.status === "INDEXED" ? "Indexé" : lastIdx.status === "UNKNOWN" ? "Erreur" : "Non indexé"}
                        />
                      ) : (
                        <StatusChip variant="muted" label="Non vérifié" />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function StatusChip({
  variant,
  label,
}: {
  variant: "signal" | "rust" | "ochre" | "azure" | "muted";
  label: string;
}) {
  const styles: Record<typeof variant, string> = {
    signal: "bg-signal text-signal-ink",
    rust: "bg-rust-soft text-rust",
    ochre: "bg-ochre-soft text-[color:hsl(34_70%_32%)]",
    azure: "bg-azure-soft text-azure",
    muted: "bg-paper-deep text-ink-3",
  };
  return (
    <span className={`inline-flex items-center rounded-[2px] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] ${styles[variant]}`}>
      {label}
    </span>
  );
}
