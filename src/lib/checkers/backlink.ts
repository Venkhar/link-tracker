/**
 * Vérification de la présence du backlink via Playwright.
 *
 * Avantages vs fetch+regex :
 *  - Le JS de la page est exécuté → liens injectés dynamiquement détectés
 *  - Pas de faux négatifs sur les sites React/Vue/SPA
 *  - Gestion propre des liens relatifs (resolveHref)
 *  - Détection nofollow / sponsored / ugc fiable via DOM réel
 */
import { prisma } from "@/lib/prisma";
import { getBrowser, randomViewport } from "@/lib/browser/instance";

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

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

  const browser = await getBrowser();
  const context = await browser.newContext({
    viewport: randomViewport(),
    locale: "fr-FR",
    extraHTTPHeaders: {
      "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
    },
  });
  const page = await context.newPage();

  try {
    const response = await page.goto(article.articleUrl, {
      waitUntil: "domcontentloaded",
      timeout: 25_000,
    });

    httpCode = response?.status() ?? null;

    // Détecte les redirections
    const finalUrl = page.url();
    if (finalUrl !== article.articleUrl && !finalUrl.startsWith("about:")) {
      redirectUrl = finalUrl;
      status = "REDIRECTED";
    }

    if (!response?.ok()) {
      status = status === "REDIRECTED" ? "REDIRECTED" : "NOT_FOUND";
    } else {
      // Laisse le JS s'exécuter (lazy-load, React hydration, etc.)
      await sleep(1_500 + Math.random() * 1_500);
      try {
        await page.waitForLoadState("networkidle", { timeout: 6_000 });
      } catch {
        // networkidle peut timeout sur les pages très actives → on continue
      }

      // Extraction des liens via le DOM réel (pas de regex)
      const result = await page.evaluate(
        ({ targetUrl }) => {
          const normalizedTarget = targetUrl.replace(/\/$/, "").toLowerCase();
          let targetDomain = "";
          try {
            targetDomain = new URL(targetUrl).hostname.toLowerCase();
          } catch {
            /* URL invalide */
          }

          const anchors = Array.from(document.querySelectorAll("a[href]"));

          for (const a of anchors) {
            // Utilise href (résolu automatiquement par le navigateur → plus de liens relatifs manqués)
            const fullHref = (a as HTMLAnchorElement).href
              .replace(/\/$/, "")
              .toLowerCase();
            const attrHref = (a.getAttribute("href") ?? "")
              .replace(/\/$/, "")
              .toLowerCase();

            const matches =
              fullHref === normalizedTarget ||
              fullHref.startsWith(normalizedTarget) ||
              attrHref === normalizedTarget ||
              attrHref.startsWith(normalizedTarget) ||
              (targetDomain !== "" && fullHref.includes(targetDomain));

            if (matches) {
              const rel = (a.getAttribute("rel") ?? "").toLowerCase();
              const dofollow =
                !rel.includes("nofollow") &&
                !rel.includes("sponsored") &&
                !rel.includes("ugc");
              return { found: true, dofollow };
            }
          }

          return { found: false, dofollow: null };
        },
        { targetUrl: article.targetUrl }
      );

      if (result.found) {
        status = "FOUND";
        isDofollow = result.dofollow;
      } else if (status !== "REDIRECTED") {
        status = "NOT_FOUND";
      }
    }
  } catch {
    status = "ERROR";
  } finally {
    await context.close();
  }

  await prisma.backlinkCheck.create({
    data: { articleId, status, httpCode, redirectUrl, isDofollow },
  });
}
