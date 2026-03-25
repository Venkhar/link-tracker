import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { BacklinksEvolutionChart } from "@/components/campaigns/backlinks-evolution-chart";
import { ArrowLeft, Link2, TrendingUp, ShieldCheck, Search, Euro, BarChart3 } from "lucide-react";
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

  // ── KPIs courants ────────────────────────────────────────
  const actifs   = articles.filter((a) => a.backlinkChecks.at(-1)?.status === "FOUND").length;
  const dofollow = articles.filter((a) => a.backlinkChecks.at(-1)?.status === "FOUND" && a.backlinkChecks.at(-1)?.isDofollow === true).length;
  const nofollow = articles.filter((a) => a.backlinkChecks.at(-1)?.status === "FOUND" && a.backlinkChecks.at(-1)?.isDofollow === false).length;
  const indexed  = articles.filter((a) => a.indexationChecks.at(-1)?.status === "INDEXED").length;
  const budget   = articles.reduce((s, a) => s + (a.prix ?? 0), 0);

  // ── Répartition par type ──────────────────────────────────
  const byType = ["ARTICLE", "FORUM", "COMMUNIQUE"].map((t) => ({
    label: t === "ARTICLE" ? "Article" : t === "FORUM" ? "Forum" : "Communiqué",
    count: articles.filter((a) => a.type === t).length,
  }));

  // ── Répartition par source ────────────────────────────────
  const sourceMap = new Map<string, number>();
  for (const a of articles) {
    const key = a.source || "—";
    sourceMap.set(key, (sourceMap.get(key) ?? 0) + 1);
  }
  const bySources = Array.from(sourceMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([source, count]) => ({ source, count }));

  // ── Données graphique : évolution semaine par semaine ─────
  // Pour chaque semaine depuis la 1ère création, on compte combien d'articles
  // avaient leur dernier check FOUND à la fin de cette semaine.
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
        // Dernier check avant la fin de cette semaine
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
    { label: "Total",    value: total,    sub: "backlinks",      color: "bg-indigo-50",  text: "text-indigo-600",  Icon: Link2 },
    { label: "Actifs",   value: actifs,   sub: total > 0 ? `${Math.round((actifs/total)*100)}%` : "0%", color: "bg-emerald-50", text: "text-emerald-600", Icon: TrendingUp },
    { label: "Dofollow", value: dofollow, sub: actifs > 0 ? `${Math.round((dofollow/actifs)*100)}% des actifs` : "—", color: "bg-sky-50", text: "text-sky-600", Icon: ShieldCheck },
    { label: "Indexés",  value: indexed,  sub: total > 0 ? `${Math.round((indexed/total)*100)}%` : "0%", color: "bg-teal-50", text: "text-teal-600", Icon: Search },
    { label: "Budget",   value: budget.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }), sub: "investi", color: "bg-violet-50", text: "text-violet-600", Icon: Euro },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/campaigns/${campaign.id}`}>
          <button className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour à la campagne
          </button>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100">
          <BarChart3 className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Rapport — {campaign.name}</h1>
          <p className="text-xs text-slate-400 font-mono">{campaign.targetDomain}</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {kpis.map(({ label, value, sub, color, text, Icon }) => (
          <div key={label} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
            <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${color}`}>
              <Icon className={`h-4 w-4 ${text}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold tabular-nums ${text}`}>{value}</p>
              <p className="text-[11px] font-semibold text-slate-500">{label}</p>
              <p className="text-[10px] text-slate-400">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Graphique d'évolution */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-800">Évolution des backlinks actifs</h2>
        <BacklinksEvolutionChart data={chartData} />
      </div>

      {/* Répartitions */}
      <div className="grid gap-4 sm:grid-cols-2">

        {/* Par type */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-800">Répartition par type</h2>
          <div className="space-y-3">
            {byType.map(({ label, count }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-xs text-slate-600">{label}</span>
                <div className="flex-1 rounded-full bg-slate-100 h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-indigo-400 transition-all"
                    style={{ width: total > 0 ? `${(count / total) * 100}%` : "0%" }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-xs font-semibold text-slate-700">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Par source */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-800">Répartition par source</h2>
          {bySources.length === 0 ? (
            <p className="text-sm text-slate-400">Aucune source renseignée.</p>
          ) : (
            <div className="space-y-3">
              {bySources.map(({ source, count }) => (
                <div key={source} className="flex items-center gap-3">
                  <span className="min-w-0 flex-1 truncate text-xs text-slate-600">{source}</span>
                  <div className="w-24 shrink-0 rounded-full bg-slate-100 h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-teal-400 transition-all"
                      style={{ width: total > 0 ? `${(count / total) * 100}%` : "0%" }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-xs font-semibold text-slate-700">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Backlinks perdus (status NOT_FOUND au dernier check) */}
      {(() => {
        const lost = articles.filter(
          (a) => a.backlinkChecks.length > 1 &&
          a.backlinkChecks.at(-1)?.status !== "FOUND" &&
          a.backlinkChecks.some((c) => c.status === "FOUND")
        );
        if (lost.length === 0) return null;
        return (
          <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-red-700">Backlinks récemment perdus ({lost.length})</h2>
            <div className="divide-y divide-slate-100">
              {lost.map((a) => {
                const lastCheck = a.backlinkChecks.at(-1)!;
                const lastDate = new Date(lastCheck.checkedAt).toLocaleDateString("fr-FR");
                let hostname = a.articleUrl;
                try { hostname = new URL(a.articleUrl).hostname; } catch { /* noop */ }
                return (
                  <div key={a.id} className="flex items-center justify-between py-2.5">
                    <a href={a.articleUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-indigo-600 hover:underline truncate max-w-xs">{hostname}</a>
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600 ring-1 ring-red-200">{lastCheck.status}</span>
                      <span className="text-[10px] text-slate-400">{lastDate}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

    </div>
  );
}
