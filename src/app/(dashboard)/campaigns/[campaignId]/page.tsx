import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { ArticleTable } from "@/components/articles/article-table";
import {
  Pencil, Plus, Upload, Globe,
  Link2, TrendingUp, ShieldCheck, Search,
} from "lucide-react";

const statusConfig: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  ACTIVE:    { label: "Active",    dot: "bg-emerald-400", bg: "bg-emerald-50",  text: "text-emerald-700" },
  PAUSED:    { label: "En pause",  dot: "bg-amber-400",   bg: "bg-amber-50",    text: "text-amber-700"   },
  COMPLETED: { label: "Terminée", dot: "bg-slate-400",   bg: "bg-slate-100",   text: "text-slate-600"   },
};

export default async function CampaignDetailPage({
  params,
}: {
  params: { campaignId: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const campaign = await prisma.campaign.findUnique({
    where: { id: params.campaignId },
    include: {
      createdBy: { select: { name: true } },
      articles: {
        orderBy: { createdAt: "desc" },
        include: {
          backlinkChecks:   { orderBy: { checkedAt: "desc" }, take: 1 },
          indexationChecks: { orderBy: { checkedAt: "desc" }, take: 1 },
        },
      },
    },
  });

  if (!campaign) notFound();

  const s = statusConfig[campaign.status] || statusConfig.ACTIVE;
  const isAdmin = session.user.role === "ADMIN";

  const total       = campaign.articles.length;
  const actifCount  = campaign.articles.filter((a) => a.backlinkChecks?.[0]?.status === "FOUND").length;
  const dofollowCnt = campaign.articles.filter((a) => a.backlinkChecks?.[0]?.isDofollow === true).length;
  const indexedCnt  = campaign.articles.filter((a) => a.indexationChecks?.[0]?.status === "INDEXED").length;
  const budget      = campaign.articles.reduce((sum, a) => sum + ((a as { prix?: number | null }).prix ?? 0), 0);

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{campaign.name}</h1>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${s.bg} ${s.text}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
              {s.label}
            </span>
          </div>
          <p className="flex items-center gap-1.5 font-mono text-xs text-slate-400">
            <Globe className="h-3.5 w-3.5" />
            {campaign.targetDomain}
          </p>
        </div>
        {isAdmin && (
          <Link href={`/campaigns/${campaign.id}/edit`}>
            <button className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-800">
              <Pencil className="h-3.5 w-3.5" />
              Modifier
            </button>
          </Link>
        )}
      </div>

      {/* ── KPI strip ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-100">
            <Link2 className="h-4 w-4 text-indigo-600" />
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums text-slate-800">{total}</p>
            <p className="text-[11px] font-medium text-slate-400">Backlinks</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums text-slate-800">{actifCount}</p>
            <p className="text-[11px] font-medium text-slate-400">Actifs</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-100">
            <ShieldCheck className="h-4 w-4 text-sky-600" />
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums text-slate-800">{dofollowCnt}</p>
            <p className="text-[11px] font-medium text-slate-400">Dofollow</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-teal-100">
            <Search className="h-4 w-4 text-teal-600" />
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums text-slate-800">{indexedCnt}</p>
            <p className="text-[11px] font-medium text-slate-400">Indexés</p>
          </div>
        </div>
      </div>

      {/* ── Actions + budget ────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Link href={`/campaigns/${campaign.id}/articles/new`}>
            <button className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 active:scale-[0.98]">
              <Plus className="h-4 w-4" />
              Ajouter un backlink
            </button>
          </Link>
          <Link href={`/campaigns/${campaign.id}/articles/import`}>
            <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50">
              <Upload className="h-4 w-4" />
              Importer CSV
            </button>
          </Link>
        </div>
        {budget > 0 && (
          <span className="text-xs text-slate-400">
            Budget investi :{" "}
            <span className="font-mono font-bold text-slate-700">
              {budget.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
            </span>
          </span>
        )}
      </div>

      {/* ── Backlinks table ─────────────────────────────────── */}
      <ArticleTable
        articles={JSON.parse(JSON.stringify(campaign.articles))}
        campaignId={campaign.id}
        isAdmin={isAdmin}
      />
    </div>
  );
}
