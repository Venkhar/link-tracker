import { NextRequest, NextResponse } from "next/server";
import { getSessionOrUnauthorized } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { articleCreateSchema } from "@/lib/validations/article";
import { checkBacklink } from "@/lib/checkers/backlink";
import { checkIndexation } from "@/lib/checkers/indexation";
import Papa from "papaparse";

export async function POST(
  req: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  const { error } = await getSessionOrUnauthorized();
  if (error) return error;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json(
      { error: "Aucun fichier fourni" },
      { status: 400 }
    );
  }

  const text = await file.text();
  const { data } = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  if (data.length > 500) {
    return NextResponse.json(
      { error: "Le fichier ne peut pas contenir plus de 500 lignes" },
      { status: 400 }
    );
  }

  const validArticles: {
    campaignId: string;
    articleUrl: string;
    targetUrl: string;
    anchorText: string;
    manualStatus: "PENDING" | "SENT" | "CONFIRMED" | "DELETED";
    prix: number | null;
    type: "ARTICLE" | "FORUM" | "COMMUNIQUE";
    source: string;
  }[] = [];
  const importErrors: { row: number; message: string }[] = [];

  data.forEach((row, index) => {
    const rawPrix = row.prix || row.price || "";
    const prixValue = rawPrix ? parseFloat(rawPrix) : undefined;

    const rawType = (row.type || "ARTICLE").toUpperCase();
    const typeValue = ["ARTICLE", "FORUM", "COMMUNIQUE"].includes(rawType)
      ? rawType
      : "ARTICLE";

    const result = articleCreateSchema.safeParse({
      articleUrl: row.article_url || row.articleUrl || row.url_article,
      targetUrl: row.target_url || row.targetUrl || row.url_cible,
      anchorText: row.anchor_text || row.anchorText || row.ancre || "",
      manualStatus:
        (row.status || row.manualStatus || "PENDING").toUpperCase(),
      prix: prixValue,
      type: typeValue,
      source: row.source || row.plateforme || "",
    });

    if (result.success) {
      validArticles.push({
        campaignId: params.campaignId,
        ...result.data,
        prix: result.data.prix ?? null,
        type: result.data.type as "ARTICLE" | "FORUM" | "COMMUNIQUE",
        source: result.data.source ?? "",
      });
    } else {
      importErrors.push({
        row: index + 2,
        message: result.error.issues.map((i) => i.message).join(", "),
      });
    }
  });

  let imported = 0;
  if (validArticles.length > 0) {
    const result = await prisma.article.createMany({
      data: validArticles,
      skipDuplicates: true,
    });
    imported = result.count;

    // Récupère les IDs des articles importés pour lancer les vérifications
    if (imported > 0) {
      const createdArticles = await prisma.article.findMany({
        where: {
          campaignId: params.campaignId,
          articleUrl: { in: validArticles.map((a) => a.articleUrl) },
        },
        select: { id: true },
      });

      // Lance les vérifications en arrière-plan par batches de 3
      // pour ne pas spammer les serveurs cibles lors d'un import massif
      const ids: string[] = createdArticles.map((a: { id: string }) => a.id);
      (async () => {
        const BATCH = 3;
        for (let i = 0; i < ids.length; i += BATCH) {
          const batch = ids.slice(i, i + BATCH);
          await Promise.all(
            batch.map((id: string) =>
              Promise.all([checkBacklink(id), checkIndexation(id)]).catch(
                console.error
              )
            )
          );
          // Pause entre les batches (hors dernier)
          if (i + BATCH < ids.length) {
            await new Promise((r) => setTimeout(r, 2_000));
          }
        }
      })().catch(console.error);
    }
  }

  return NextResponse.json({
    imported,
    total: data.length,
    errors: importErrors,
  });
}
