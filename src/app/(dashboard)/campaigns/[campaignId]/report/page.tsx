import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { BacklinksEvolutionChart } from "@/components/campaigns/backlinks-evolution-chart";
import { ArrowLeft } from "lucide-react";
import { format, startOfWeek, addWeeks } from "date-fns";
import { fr } from "date-fns/locale";

export default async function CampaignReportPage({
  params,
}: {
  params: { campaignId: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const campaign = await prisma.campaign.findUnique({
    where: { id: params.campaignId },
    include: {
      articles: {
        include: {
          backlinkChecks:   { orderBy: { checkedAt: "asc" } },
          indexationChecks: { orderBy: { checkedAt: "asc" } },
        },
      },
    },
  });

  if (!campaign) notFound();

  const articles = campaign.articles;
  const total    = articles.length;

  const actifs   = articles.filter((a) => a.backlinkChecks.at(-1)?.status === "FOUND").length;
  const dofollow = articles.filter((a) => a.backlinkChecks.at(-1)?.status === "FOUND" && a.backlinkChecks.at(-1)?.isDofollow === true).length;
  const indexed  = articles.filter((a) => a.indexationChecks.at(-1)?.status === "INDEXED").length;
  const budget   = articles.reduce((s, a) => s + (a.prix ?? 0), 0);

  const byType = ["ARTICLE", "FORUM", "COMMUNIQUE"].map((t) => ({
    label: t === "ARTICLE" ? "Article" : t === "FORUM" ? "Forum" : "Communiqué",
    count: articles.filter((a) => a.type === t).length,
  }));

  const sourceMap = new Map<string, number>();
  for (const a of articles) {
    const key = a.source || "—";
    sourceMap.set(key, (sourceMap.get(key) ?? 0) + 1);
  }
  const bySources = Array.from(sourceMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([source, count]) => ({ source, count }));

  const allDates = articles.flatMap((a) => a.backlinkChecks.map((c) => new Date(c.checkedAt)));
  const chartData: { label: string; actifs: number; inactifs: number }[] = [];

  if (allDates.length > 0) {
    const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
    const maxDate = new Date();
    let cursor = startOfWeek(minDate, { weekStartsOn: 1 });
    const MAX_WEEKS = 26;
    let count = 0;

    while (cursor <= maxDate && count < MAX_WEEKS) {
      const weekEnd = addWeeks(cursor, 1);
      let weekActifs = 0;
      let weekInactifs = 0;

      for (const article of articles) {
        const lastCheck = [...article.backlinkChecks]
          .filter((c) => new Date(c.checkedAt) <= weekEnd)
          .at(-1);
        if (lastCheck) {
          if (lastCheck.status === "FOUND") weekActifs++;
          else weekInactifs++;
        }
      }

      chartData.push({
        label: format(cursor, "dd MMM", { locale: fr }),
        actifs: weekActifs,
        inactifs: weekInactifs,
      });

      cursor = weekEnd;
      count++;
    }
  }

  const kpis = [
    { label: "Total",    value: total,    sub: "backlinks" },
    { label: "Actifs",   value: actifs,   sub: total > 0 ? `${Math.round((actifs/total)*100)}%` : "0%" },
    { label: "Dofollow", value: dofollow, sub: actifs > 0 ? `${Math.round((dofollow/actifs)*100)}% des actifs` : "—" },
    { label: "Indexés",  value: indexed,  sub: total > 0 ? `${Math.round((indexed/total)*100)}%` : "0%" },
    { label: "Budget",   value: budget.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }), sub: "investi" },
  ];

  const lost = articles.filter(
    (a) => a.backlinkChecks.length > 1 &&
    a.backlinkChecks.at(-1)?.status !== "FOUND" &&
    a.backlinkChecks.some((c) => c.status === "FOUND")
  );

  return (
    <div className="space-y-10">

      {/* ── Editorial header ─────────────────────────────── */}
      <section className="border-b border-ink/20 pb-8">
        <div className="flex items-center gap-3 mb-4">
          <Link
            href={`/campaigns/${campaign.id}`}
            className="eyebrow hover:text-ink transition-colors inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="h-3 w-3" />
            Retour à la campagne
          </Link>
          <span className="h-px flex-1 bg-ink/15" />
          <span className="eyebrow">Rapport analytique</span>
        </div>
        <h1 className="font-serif text-[48px] leading-[0.95] tracking-tightest">
          Rapport <span className="italic font-light">« {campaign.name} »</span>
        </h1>
        <p className="mono text-xs text-ink-3 mt-3">{campaign.targetDomain}</p>
      </section>

      {/* ── KPIs ─────────────────────────────────────────── */}
      <section>
        <div className="grid grid-cols-2 md:grid-cols-5 border-t border-b border-ink/20 divide-x divide-ink/15">
          {kpis.map(({ label, value, sub }, i) => (
            <div key={label} className="px-4 py-5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="eyebrow">{label}</span>
                <span className="mono text-[10px] text-ink-4 tabular-nums">0{i + 1}</span>
              </div>
              <div className="figure-display text-[40px] text-ink">{value}</div>
              <div className="text-[11px] text-ink-3">{sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Graphique ────────────────────────────────────── */}
      <section className="sheet p-6">
        <div className="flex items-baseline justify-between mb-5">
          <div>
            <span className="eyebrow">Série chronologique</span>
            <h2 className="font-serif text-xl tracking-tight mt-1">Évolution hebdomadaire</h2>
          </div>
          <span className="mono text-[10px] text-ink-4">26 dernières semaines max</span>
        </div>
        <BacklinksEvolutionChart data={chartData} />
      </section>

      {/* ── Répartitions ─────────────────────────────────── */}
      <section className="grid gap-8 md:grid-cols-2">

        <div>
          <div className="flex items-baseline justify-between mb-4 pb-3 border-b border-ink/15">
            <div>
              <span className="eyebrow">Composition</span>
              <h2 className="font-serif text-lg tracking-tight mt-0.5">Par type</h2>
            </div>
            <span className="mono text-[10px] text-ink-4 tabular-nums">/{byType.length}</span>
          </div>
          <div className="space-y-4">
            {byType.map(({ label, count }) => (
              <BarRow key={label} label={label} count={count} total={total} variant="ink" />
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-4 pb-3 border-b border-ink/15">
            <div>
              <span className="eyebrow">Origine</span>
              <h2 className="font-serif text-lg tracking-tight mt-0.5">Par source</h2>
            </div>
            <span className="mono text-[10px] text-ink-4 tabular-nums">/{bySources.length}</span>
          </div>
          {bySources.length === 0 ? (
            <p className="font-serif italic text-ink-3 text-sm">Aucune source renseignée.</p>
          ) : (
            <div className="space-y-4">
              {bySources.map(({ source, count }) => (
                <BarRow key={source} label={source} count={count} total={total} variant="azure" />
              ))}
            </div>
          )}
        </div>

      </section>

      {/* ── Backlinks perdus ─────────────────────────────── */}
      {lost.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between mb-4 pb-3 border-b border-rust/40">
            <div>
              <span className="eyebrow text-rust">Pertes</span>
              <h2 className="font-serif text-xl tracking-tight mt-0.5 text-rust">Backlinks récemment perdus</h2>
            </div>
            <span className="figure-display text-2xl text-rust tabular-nums">{lost.length}</span>
          </div>
          <ul className="divide-y divide-ink/10 border-t border-b border-ink/15">
            {lost.map((a, i) => {
              const lastCheck = a.backlinkChecks.at(-1)!;
              const lastDate = new Date(lastCheck.checkedAt).toLocaleDateString("fr-FR");
              let hostname = a.articleUrl;
              try { hostname = new URL(a.articleUrl).hostname.replace(/^www\./, ""); } catch { /* noop */ }
              return (
                <li key={a.id} className="flex items-center gap-3 py-3">
                  <span className="mono text-[10px] text-ink-4 tabular-nums w-6 shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <a
                    href={a.articleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mono text-xs text-ink hover:text-rust transition-colors truncate flex-1"
                  >
                    {hostname}
                  </a>
                  <span className="inline-flex items-center rounded-[2px] chip-rust px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em]">
                    {lastCheck.status}
                  </span>
                  <span className="mono text-[11px] text-ink-4 tabular-nums shrink-0">{lastDate}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

    </div>
  );
}

function BarRow({
  label,
  count,
  total,
  variant,
}: {
  label: string;
  count: number;
  total: number;
  variant: "ink" | "azure";
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  const fill = variant === "ink" ? "bg-ink" : "bg-azure";
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-xs text-ink-2 truncate font-serif italic">{label}</span>
      <div className="flex-1 h-1 bg-paper-deep overflow-hidden rounded-[1px]">
        <div
          className={`h-full transition-all ${fill}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-10 shrink-0 text-right mono text-xs text-ink tabular-nums">{count}</span>
    </div>
  );
}
