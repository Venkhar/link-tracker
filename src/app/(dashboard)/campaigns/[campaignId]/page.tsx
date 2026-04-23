import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { ArticleTable } from "@/components/articles/article-table";
import {
  Pencil, Plus, Upload, Globe, BarChart3,
} from "lucide-react";

const statusConfig: Record<string, { label: string; chip: string; dot: string }> = {
  ACTIVE:    { label: "Active",   chip: "chip-signal", dot: "bg-signal-ink" },
  PAUSED:    { label: "En pause", chip: "chip-ochre",  dot: "bg-ochre" },
  COMPLETED: { label: "Terminée", chip: "bg-paper-deep text-ink-3", dot: "bg-ink-4" },
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

  const kpis = [
    { label: "Backlinks", value: total },
    { label: "Actifs",    value: actifCount },
    { label: "Dofollow",  value: dofollowCnt },
    { label: "Indexés",   value: indexedCnt },
  ];

  return (
    <div className="space-y-10">

      {/* ── Editorial header ───────────────────────────────── */}
      <section className="border-b border-ink/20 pb-8">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/campaigns" className="eyebrow hover:text-ink transition-colors">
            ← Campagnes
          </Link>
          <span className="h-px flex-1 bg-ink/15" />
          <span className={`inline-flex items-center gap-1.5 rounded-[2px] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] ${s.chip}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
            {s.label}
          </span>
        </div>

        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-[48px] leading-[0.95] tracking-tightest text-ink">
              {campaign.name}
            </h1>
            <p className="mt-3 flex items-center gap-2 mono text-xs text-ink-3">
              <Globe className="h-3.5 w-3.5" />
              {campaign.targetDomain}
            </p>
          </div>
          {isAdmin && (
            <Link
              href={`/campaigns/${campaign.id}/edit`}
              className="inline-flex items-center gap-2 rounded-[3px] border border-ink/20 bg-transparent px-3.5 py-2 text-xs font-medium uppercase tracking-[0.12em] text-ink hover:bg-ink/5 transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
              Modifier
            </Link>
          )}
        </div>
      </section>

      {/* ── KPI editorial strip ────────────────────────────── */}
      <section>
        <div className="grid grid-cols-2 md:grid-cols-4 border-t border-b border-ink/20 divide-x divide-ink/15">
          {kpis.map(({ label, value }, i) => (
            <div key={label} className="px-5 py-6 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="eyebrow">{label}</span>
                <span className="mono text-[10px] text-ink-4 tabular-nums">0{i + 1}</span>
              </div>
              <div className="figure-display text-[56px] text-ink">{value}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Actions + budget ──────────────────────────────── */}
      <section className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Link href={`/campaigns/${campaign.id}/articles/new`} className="btn-ink">
            <Plus className="h-3.5 w-3.5" />
            Ajouter un backlink
          </Link>
          <Link
            href={`/campaigns/${campaign.id}/articles/import`}
            className="inline-flex items-center gap-2 rounded-[3px] border border-ink/20 bg-transparent px-3.5 py-2 text-xs font-medium uppercase tracking-[0.12em] text-ink hover:bg-ink/5 transition-colors"
          >
            <Upload className="h-3.5 w-3.5" />
            Importer CSV
          </Link>
          <Link
            href={`/campaigns/${campaign.id}/report`}
            className="inline-flex items-center gap-2 rounded-[3px] border border-ink/20 bg-transparent px-3.5 py-2 text-xs font-medium uppercase tracking-[0.12em] text-ink hover:bg-ink/5 transition-colors"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Rapport
          </Link>
        </div>
        {budget > 0 && (
          <div className="flex items-baseline gap-2 font-serif text-ink">
            <span className="eyebrow text-ink-3">Budget</span>
            <span className="figure-display text-2xl tabular-nums">
              {budget.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
            </span>
          </div>
        )}
      </section>

      {/* ── Backlinks table ───────────────────────────────── */}
      <ArticleTable
        articles={JSON.parse(JSON.stringify(campaign.articles))}
        campaignId={campaign.id}
        isAdmin={isAdmin}
      />
    </div>
  );
}
