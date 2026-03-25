import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { ExternalLink, Link2, TrendingUp, ShieldCheck, ShieldOff, Search, CalendarDays } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  // Charge tous les articles avec leur dernier check backlink + indexation
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
      take: 5,
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

  const ceMois      = allArticles.filter((a) => a.createdAt >= startOfThisMonth).length;
  const lastMois    = allArticles.filter((a) => a.createdAt >= startOfLastMonth && a.createdAt < startOfThisMonth).length;
  const ceMoisGrowth = lastMois > 0 ? Math.round(((ceMois - lastMois) / lastMois) * 100) : 0;

  const actifsPercent   = total > 0 ? Math.round((actifs / total) * 100) : 0;
  const dofollowPercent = actifs > 0 ? Math.round((dofollow / actifs) * 100) : 0;
  const nofollowPercent = actifs > 0 ? Math.round((nofollow / actifs) * 100) : 0;
  const indexedPercent  = total > 0 ? Math.round((indexed / total) * 100) : 0;

  const kpis = [
    { label: "Total",    value: total,    sub: "backlinks",         color: "bg-indigo-500",  light: "bg-indigo-50",  text: "text-indigo-600",  Icon: Link2 },
    { label: "Actifs",   value: actifs,   sub: `${actifsPercent}%`, color: "bg-emerald-500", light: "bg-emerald-50", text: "text-emerald-600", Icon: TrendingUp },
    { label: "Dofollow", value: dofollow, sub: `${dofollowPercent}% des actifs`, color: "bg-sky-500",     light: "bg-sky-50",     text: "text-sky-600",     Icon: ShieldCheck },
    { label: "Nofollow", value: nofollow, sub: `${nofollowPercent}% des actifs`, color: "bg-orange-400",  light: "bg-orange-50",  text: "text-orange-600",  Icon: ShieldOff },
    { label: "Indexés",  value: indexed,  sub: `${indexedPercent}%`,color: "bg-teal-500",    light: "bg-teal-50",    text: "text-teal-600",    Icon: Search },
    { label: "Ce mois",  value: `+${ceMois}`, sub: ceMoisGrowth !== 0 ? `${ceMoisGrowth > 0 ? "↑" : "↓"}${Math.abs(ceMoisGrowth)}% vs mois dernier` : "vs mois dernier", color: "bg-violet-500", light: "bg-violet-50", text: "text-violet-600", Icon: CalendarDays },
  ];

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">
          Bonjour, {session.user.name} 👋
        </h1>
        <p className="text-sm text-gray-500">Vue d&apos;ensemble de vos campagnes de backlinks</p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map(({ label, value, sub, color, light, text, Icon }) => (
          <div key={label} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
            <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${light}`}>
              <Icon className={`h-4 w-4 ${text}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold tabular-nums ${text}`}>{value}</p>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-500">{label}</p>
              <p className="text-[10px] text-slate-400">{sub}</p>
            </div>
            <div className={`h-1 w-full rounded-full ${color} opacity-20`} />
          </div>
        ))}
      </div>

      {/* Campagnes actives + backlinks récents */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Campagnes actives */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-3.5 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Campagnes actives</h2>
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-100 px-1.5 text-[11px] font-bold text-indigo-700">{campaignCount}</span>
          </div>
          <div className="p-5 flex flex-col items-center justify-center gap-1 text-center py-10">
            <p className="text-4xl font-bold text-indigo-600 tabular-nums">{campaignCount}</p>
            <p className="text-sm text-slate-400">campagne{campaignCount > 1 ? "s" : ""} en cours</p>
            <Link href="/campaigns" className="mt-3 text-xs font-medium text-indigo-500 hover:text-indigo-700 transition-colors">
              Voir toutes les campagnes →
            </Link>
          </div>
        </div>

        {/* Backlinks récents */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-slate-800">Backlinks récents</h2>
          </div>
          {recentArticles.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-slate-500">Aucun backlink enregistré.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentArticles.map((article) => {
                const lastCheck = article.backlinkChecks[0];
                const lastIdx   = article.indexationChecks[0];
                let hostname = article.articleUrl;
                try { hostname = new URL(article.articleUrl).hostname; } catch { /* noop */ }

                return (
                  <div key={article.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <a
                        href={article.articleUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 font-mono text-xs font-medium text-indigo-600 hover:underline truncate max-w-[220px]"
                      >
                        {hostname}
                        <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                      </a>
                      <Link href={`/campaigns/${article.campaign.id}`} className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors">
                        {article.campaign.name}
                      </Link>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {/* Actif / Inactif */}
                      {lastCheck ? (
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          lastCheck.status === "FOUND"
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                            : "bg-red-50 text-red-600 ring-1 ring-red-200"
                        }`}>
                          {lastCheck.status === "FOUND" ? "Actif" : "Inactif"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-slate-50 text-slate-400 ring-1 ring-slate-200">—</span>
                      )}
                      {/* Dofollow */}
                      {lastCheck?.status === "FOUND" && lastCheck.isDofollow !== null && (
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          lastCheck.isDofollow
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                            : "bg-slate-100 text-slate-500 ring-1 ring-slate-200"
                        }`}>
                          {lastCheck.isDofollow ? "dofollow" : "nofollow"}
                        </span>
                      )}
                      {/* Indexé */}
                      {lastIdx ? (
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          lastIdx.status === "INDEXED"
                            ? "bg-teal-50 text-teal-700 ring-1 ring-teal-200"
                            : lastIdx.status === "UNKNOWN"
                            ? "bg-orange-50 text-orange-600 ring-1 ring-orange-200"
                            : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                        }`}>
                          {lastIdx.status === "INDEXED" ? "Indexé" : lastIdx.status === "UNKNOWN" ? "Erreur" : "Non indexé"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-slate-50 text-slate-400 ring-1 ring-slate-200">Non vérifié</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
