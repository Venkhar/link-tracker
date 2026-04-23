import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { CampaignTable } from "@/components/campaigns/campaign-table";
import { Plus } from "lucide-react";

export default async function CampaignsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const isAdmin = session.user.role === "ADMIN";

  const where = isAdmin
    ? {}
    : {
        OR: [
          { createdById: session.user.id },
          { members: { some: { userId: session.user.id } } },
        ],
      };

  const campaigns = await prisma.campaign.findMany({
    where,
    include: {
      _count: { select: { articles: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-10">
      {/* Editorial header */}
      <section className="border-b border-ink/20 pb-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="eyebrow">Registre</span>
          <span className="h-px flex-1 bg-ink/15" />
          <span className="mono text-[10px] text-ink-4 tabular-nums uppercase tracking-wider">
            {campaigns.length.toString().padStart(3, "0")} entrées
          </span>
        </div>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-serif text-[48px] leading-[0.95] tracking-tightest">
              Campagnes <span className="italic font-light">de surveillance</span>
            </h1>
            <p className="text-sm text-ink-3 mt-3 max-w-lg">
              Chaque campagne rassemble les backlinks d&apos;un client ou d&apos;une thématique.
              Ouvrez-en une pour voir son détail.
            </p>
          </div>
          <Link href="/campaigns/new" className="btn-ink">
            <Plus className="h-3.5 w-3.5" />
            Nouvelle campagne
          </Link>
        </div>
      </section>

      <CampaignTable
        campaigns={JSON.parse(JSON.stringify(campaigns))}
        isAdmin={isAdmin}
      />
    </div>
  );
}
