import { NextRequest, NextResponse } from "next/server";
import { getSessionOrUnauthorized } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkBacklink } from "@/lib/checkers/backlink";
import { checkIndexation } from "@/lib/checkers/indexation";

/**
 * POST /api/campaigns/[campaignId]/articles/[articleId]/check
 * Body : { type: "backlink" | "indexation" | "all" }
 *
 * Lance la vérification demandée et retourne les derniers résultats.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { campaignId: string; articleId: string } }
) {
  const { error } = await getSessionOrUnauthorized();
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const type: string = body.type ?? "all";

  const article = await prisma.article.findFirst({
    where: { id: params.articleId, campaignId: params.campaignId },
    select: { id: true },
  });
  if (!article) {
    return NextResponse.json({ error: "Article introuvable" }, { status: 404 });
  }

  try {
    if (type === "backlink" || type === "all") {
      await checkBacklink(params.articleId);
    }
    if (type === "indexation" || type === "all") {
      await checkIndexation(params.articleId);
    }

    // Retourne les derniers résultats pour mise à jour immédiate de l'UI
    const [lastBacklink, lastIndexation] = await Promise.all([
      prisma.backlinkCheck.findFirst({
        where: { articleId: params.articleId },
        orderBy: { checkedAt: "desc" },
      }),
      prisma.indexationCheck.findFirst({
        where: { articleId: params.articleId },
        orderBy: { checkedAt: "desc" },
      }),
    ]);

    return NextResponse.json({ backlink: lastBacklink, indexation: lastIndexation });
  } catch {
    return NextResponse.json(
      { error: "Erreur lors de la vérification" },
      { status: 500 }
    );
  }
}
