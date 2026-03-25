/**
 * Cron quotidien — vérifie les backlinks à leur date anniversaire mensuelle.
 *
 * Appel attendu (ex. Coolify scheduler ou cron externe) :
 *   GET /api/cron/verify
 *   Authorization: Bearer <CRON_SECRET>
 *
 * Logique d'anniversaire :
 *   Un article créé le 5 mars sera re-vérifié le 5 de chaque mois.
 *   Si le mois courant n'a pas ce jour (ex. 30 févier), on prend le dernier jour du mois.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkBacklink } from "@/lib/checkers/backlink";
import { checkIndexation } from "@/lib/checkers/indexation";

function isDueToday(createdAt: Date): boolean {
  const today = new Date();
  const createdDay = createdAt.getDate();

  // Dernier jour du mois courant
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

  // L'article est dû aujourd'hui si :
  // - son jour de création == jour actuel, OU
  // - son jour de création > dernier jour du mois ET on est au dernier jour du mois
  return (
    today.getDate() === createdDay ||
    (createdDay > lastDayOfMonth && today.getDate() === lastDayOfMonth)
  );
}

export async function GET(req: NextRequest) {
  // Vérification du secret
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Récupère tous les articles avec leur date de création
  const articles = await prisma.article.findMany({
    select: { id: true, createdAt: true },
  });

  const due = articles.filter((a) => isDueToday(a.createdAt));

  if (due.length === 0) {
    return NextResponse.json({ message: "Aucun article à vérifier aujourd'hui", checked: 0 });
  }

  // Lance les vérifications en batches de 3 en arrière-plan
  const ids = due.map((a) => a.id);
  (async () => {
    const BATCH = 3;
    for (let i = 0; i < ids.length; i += BATCH) {
      const batch = ids.slice(i, i + BATCH);
      await Promise.all(
        batch.map((id) =>
          Promise.all([checkBacklink(id), checkIndexation(id)]).catch(console.error)
        )
      );
      if (i + BATCH < ids.length) {
        await new Promise((r) => setTimeout(r, 2_000));
      }
    }
  })().catch(console.error);

  return NextResponse.json({
    message: `Vérification lancée pour ${due.length} article(s)`,
    checked: due.length,
    ids,
  });
}
