import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { Megaphone, FileText, ExternalLink } from "lucide-react";
import { OverviewStats } from "@/components/dashboard/overview-stats";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [campaignCount, articleCount, recentArticles, confirmedArticles, thisMoisArticles, lastMoisArticles] =
    await Promise.all([
      prisma.campaign.count({ where: { status: "ACTIVE" } }),
      prisma.article.count(),
      prisma.article.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { campaign: { select: { name: true, id: true } } },
      }),
      prisma.article.count({ where: { manualStatus: "CONFIRMED" } }),
      prisma.article.count({ where: { createdAt: { gte: startOfThisMonth } } }),
      prisma.article.count({ where: { createdAt: { gte: startOfLastMonth, lt: startOfThisMonth } } }),
    ]);

  const ceMoisGrowth =
    lastMoisArticles > 0
      ? Math.round(((thisMoisArticles - lastMoisArticles) / lastMoisArticles) * 100)
      : 0;

  const statusConfig: Record<string, { label: string; dot: string; bg: string; text: string }> = {
    PENDING:   { label: "En attente", dot: "bg-amber-400",   bg: "bg-amber-50",   text: "text-amber-700" },
    SENT:      { label: "Envoyé",     dot: "bg-blue-400",    bg: "bg-blue-50",    text: "text-blue-700" },
    CONFIRMED: { label: "Confirmé",   dot: "bg-emerald-400", bg: "bg-emerald-50", text: "text-emerald-700" },
    DELETED:   { label: "Supprimé",   dot: "bg-red-400",     bg: "bg-red-50",     text: "text-red-700" },
  };

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">
          Bonjour, {session.user.name} 👋
        </h1>
        <p className="text-sm text-gray-500">Vue d&apos;ensemble de vos campagnes de backlinks</p>
      </div>

      {/* Overview stats */}
      <OverviewStats
        total={articleCount}
        actifs={confirmedArticles}
        ceMois={thisMoisArticles}
        ceMoisGrowth={ceMoisGrowth}
      />

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Campagnes actives</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50">
              <Megaphone className="h-4 w-4 text-indigo-500" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-gray-900">{campaignCount}</p>
          <p className="mt-1 text-xs text-gray-400">campagnes en cours</p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Articles suivis</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
              <FileText className="h-4 w-4 text-blue-500" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-gray-900">{articleCount}</p>
          <p className="mt-1 text-xs text-gray-400">backlinks enregistrés</p>
        </div>
      </div>

      {/* Recent articles */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="border-b px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Articles récents</h2>
        </div>
        {recentArticles.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-gray-500">Aucun article pour le moment.</p>
            <p className="mt-1 text-xs text-gray-400">Commencez par créer une campagne.</p>
          </div>
        ) : (
          <div className="divide-y">
            {recentArticles.map((article) => {
              const s = statusConfig[article.manualStatus] || statusConfig.PENDING;
              let hostname = article.articleUrl;
              try { hostname = new URL(article.articleUrl).hostname; } catch { /* noop */ }
              return (
                <div key={article.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <a
                        href={article.articleUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline truncate max-w-[240px]"
                      >
                        {hostname}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{article.campaign.name}</p>
                  </div>
                  <span className={`ml-4 shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${s.bg} ${s.text}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
