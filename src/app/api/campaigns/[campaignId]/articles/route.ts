import { NextRequest, NextResponse } from "next/server";
import { getSessionOrUnauthorized } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { articleCreateSchema } from "@/lib/validations/article";
import { checkBacklink } from "@/lib/checkers/backlink";
import { checkIndexation } from "@/lib/checkers/indexation";

export async function GET(
  req: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  const { error } = await getSessionOrUnauthorized();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "25");

  const where: Record<string, unknown> = {
    campaignId: params.campaignId,
  };

  if (status) where.manualStatus = status;
  if (search) {
    where.OR = [
      { articleUrl: { contains: search, mode: "insensitive" } },
      { targetUrl: { contains: search, mode: "insensitive" } },
    ];
  }

  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      where,
      include: {
        backlinkChecks: { orderBy: { checkedAt: "desc" }, take: 1 },
        indexationChecks: { orderBy: { checkedAt: "desc" }, take: 1 },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.article.count({ where }),
  ]);

  return NextResponse.json({ articles, total, page, limit });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  const { error } = await getSessionOrUnauthorized();
  if (error) return error;

  const body = await req.json();
  const parsed = articleCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const article = await prisma.article.create({
    data: {
      ...parsed.data,
      campaignId: params.campaignId,
    },
  });

  // Lance les vérifications en arrière-plan sans bloquer la réponse
  Promise.all([
    checkBacklink(article.id),
    checkIndexation(article.id),
  ]).catch(console.error);

  return NextResponse.json(article, { status: 201 });
}
