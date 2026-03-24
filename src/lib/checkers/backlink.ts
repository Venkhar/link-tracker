import { prisma } from "@/lib/prisma";

const FETCH_TIMEOUT = 15_000;
const USER_AGENT =
  "Mozilla/5.0 (compatible; LinkTrackerBot/1.0; +https://linktracker.app)";

/**
 * Vérifie la présence du backlink dans le HTML de l'article et détecte dofollow/nofollow.
 * Stocke le résultat dans BacklinkCheck.
 */
export async function checkBacklink(articleId: string): Promise<void> {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: { articleUrl: true, targetUrl: true },
  });
  if (!article) return;

  let status: "FOUND" | "NOT_FOUND" | "ERROR" | "REDIRECTED" = "ERROR";
  let httpCode: number | null = null;
  let redirectUrl: string | null = null;
  let isDofollow: boolean | null = null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(article.articleUrl, {
      headers: { "User-Agent": USER_AGENT },
      redirect: "follow",
      signal: controller.signal,
    });
    clearTimeout(timer);

    httpCode = response.status;

    // Détecte si une redirection a eu lieu
    if (response.url !== article.articleUrl) {
      redirectUrl = response.url;
      status = "REDIRECTED";
    }

    if (response.ok) {
      const html = await response.text();

      // Normalise l'URL cible pour la comparaison
      const normalizedTarget = article.targetUrl
        .replace(/\/$/, "")
        .toLowerCase();
      let targetDomain = "";
      try {
        targetDomain = new URL(article.targetUrl).hostname.toLowerCase();
      } catch {
        // URL invalide, on continue sans le domaine
      }

      // Parcourt tous les <a ...> du HTML
      const anchorRegex = /<a\s([^>]*?)>/gi;
      let match: RegExpExecArray | null;
      let found = false;

      while ((match = anchorRegex.exec(html)) !== null) {
        const attrs = match[1];

        const hrefMatch = /href\s*=\s*["']([^"']*)["']/i.exec(attrs);
        if (!hrefMatch) continue;

        const href = hrefMatch[1].replace(/\/$/, "").toLowerCase().trim();

        const matches =
          href === normalizedTarget ||
          href.startsWith(normalizedTarget) ||
          (targetDomain !== "" && href.includes(targetDomain));

        if (matches) {
          found = true;
          status = "FOUND";

          // Détecte rel="nofollow" (ou sponsored/ugc qui impliquent nofollow)
          const relMatch = /rel\s*=\s*["']([^"']*)["']/i.exec(attrs);
          if (relMatch) {
            const relVal = relMatch[1].toLowerCase();
            isDofollow = !(
              relVal.includes("nofollow") ||
              relVal.includes("sponsored") ||
              relVal.includes("ugc")
            );
          } else {
            // Pas d'attribut rel = dofollow par défaut
            isDofollow = true;
          }
          break;
        }
      }

      if (!found && status !== "REDIRECTED") {
        status = "NOT_FOUND";
      }
    } else if (httpCode >= 300 && httpCode < 400) {
      status = "REDIRECTED";
    } else {
      status = "NOT_FOUND";
    }
  } catch {
    status = "ERROR";
  }

  await prisma.backlinkCheck.create({
    data: { articleId, status, httpCode, redirectUrl, isDofollow },
  });
}
