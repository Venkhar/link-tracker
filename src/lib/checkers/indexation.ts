import { prisma } from "@/lib/prisma";

const FETCH_TIMEOUT = 15_000;
const USER_AGENT =
  "Mozilla/5.0 (compatible; LinkTrackerBot/1.0; +https://linktracker.app)";

/**
 * Vérifie l'indexation de la page via scraping :
 *  - HTTP 4xx/5xx → NOT_INDEXED
 *  - meta robots "noindex" ou header X-Robots-Tag "noindex" → NOT_INDEXED
 *  - HTTP 200 + aucune directive noindex → INDEXED
 *  - Erreur réseau / timeout → UNKNOWN
 *
 * Stocke le résultat dans IndexationCheck avec source=SCRAPING.
 */
export async function checkIndexation(articleId: string): Promise<void> {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: { articleUrl: true },
  });
  if (!article) return;

  let status: "INDEXED" | "NOT_INDEXED" | "UNKNOWN" = "UNKNOWN";

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(article.articleUrl, {
      headers: { "User-Agent": USER_AGENT },
      redirect: "follow",
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!response.ok) {
      // 4xx / 5xx → page inaccessible → non indexée
      status = "NOT_INDEXED";
    } else {
      // Vérifie l'en-tête X-Robots-Tag
      const xRobots = (response.headers.get("x-robots-tag") || "").toLowerCase();
      if (xRobots.includes("noindex")) {
        status = "NOT_INDEXED";
      } else {
        const html = await response.text();

        // Vérifie <meta name="robots" content="..noindex..">
        // Les deux ordres d'attributs sont couverts
        const noindexInMeta =
          /<meta\s[^>]*name\s*=\s*["']robots["'][^>]*content\s*=\s*["'][^"']*noindex[^"']*["']/i.test(
            html
          ) ||
          /<meta\s[^>]*content\s*=\s*["'][^"']*noindex[^"']*["'][^>]*name\s*=\s*["']robots["']/i.test(
            html
          );

        status = noindexInMeta ? "NOT_INDEXED" : "INDEXED";
      }
    }
  } catch {
    // Timeout ou erreur réseau
    status = "UNKNOWN";
  }

  await prisma.indexationCheck.create({
    data: { articleId, status, source: "SCRAPING" },
  });
}
