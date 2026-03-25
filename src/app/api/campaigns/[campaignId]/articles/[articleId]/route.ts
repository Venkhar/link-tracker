import { NextRequest, NextResponse } from "next/server";
import { getSessionOrUnauthorized, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { articleUpdateSchema } from "@/lib/validations/article";

export async function GET(
  req: NextRequest,
  { params }: { params: { campaignId: string; articleId: string } }
) {
  const { error } = await getSessionOrUnauthorized();
  if (error) return error;

  const article = await prisma.article.findUnique({
    where: { id: params.articleId },
    include: {
      backlinkChecks: { orderBy: { checkedAt: "desc" } },
      indexationChecks: { orderBy: { checkedAt: "desc" } },
    },
  });

  if (!article) {
    return NextResponse.json({ error: "Article introuvable" }, { status: 404 });
  }

  return NextResponse.json(article);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { campaignId: string; articleId: string } }
) {
  const { error } = await getSessionOrUnauthorized();
  if (error) return error;

  const body = await req.json();
  const parsed = articleUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const article = await prisma.article.update({
    where: { id: params.articleId },
    data: parsed.data,
  });

  return NextResponse.json(article);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { campaignId: string; articleId: string } }
) {
  const { session, error } = await getSessionOrUnauthorized();
  if (error) return error;

  const adminError = requireAdmin(session.user.role);
  if (adminError) return adminError;

  await prisma.article.delete({
    where: { id: params.articleId },
  });

  return NextResponse.json({ success: true });
}
