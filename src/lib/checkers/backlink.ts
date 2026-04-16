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
import { appLog } from "@/lib/logger";

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export async function checkBacklink(articleId: string): Promise<void> {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: { articleUrl: true, targetUrl: true },
  });
  if (!article) return;

  appLog("INFO", "backlink.check", `Début vérification backlink`, { articleId, articleUrl: article.articleUrl, targetUrl: article.targetUrl });

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
          // Décompose l'URL cible en hostname + pathname pour comparaison stricte
          let targetHostname = "";
          let targetPathname = "";
          try {
            const t = new URL(targetUrl);
            targetHostname = t.hostname.toLowerCase();
            // Normalise le pathname : retire le slash final
            targetPathname = t.pathname.replace(/\/$/, "").toLowerCase() || "/";
          } catch {
            return { found: false, dofollow: null };
          }

          const anchors = Array.from(document.querySelectorAll("a[href]"));

          for (const a of anchors) {
            // .href est résolu par le navigateur (liens relatifs → absolus)
            const raw = (a as HTMLAnchorElement).href;
            if (!raw || raw.startsWith("mailto:") || raw.startsWith("tel:") || raw.startsWith("javascript:")) continue;

            try {
              const h = new URL(raw);
              const hHostname = h.hostname.toLowerCase();
              const hPathname = h.pathname.replace(/\/$/, "").toLowerCase() || "/";

              // Même domaine ET même chemin (query params et fragments ignorés)
              if (hHostname === targetHostname && hPathname === targetPathname) {
                const rel = (a.getAttribute("rel") ?? "").toLowerCase();
                const dofollow =
                  !rel.includes("nofollow") &&
                  !rel.includes("sponsored") &&
                  !rel.includes("ugc");
                return { found: true, dofollow };
              }
            } catch {
              // href non parsable → on passe
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
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    appLog("ERROR", "backlink.check", `Erreur lors de la vérification`, { articleId, articleUrl: article.articleUrl, error: errorMsg });
    status = "ERROR";
  } finally {
    await context.close();
  }

  const levelMap = { FOUND: "INFO", NOT_FOUND: "WARN", ERROR: "ERROR", REDIRECTED: "WARN" } as const;
  const msgMap = {
    FOUND: `Backlink trouvé (dofollow: ${isDofollow})`,
    NOT_FOUND: "Backlink non trouvé sur la page",
    ERROR: "Erreur lors de la vérification",
    REDIRECTED: `Page redirigée vers ${redirectUrl}`,
  };
  appLog(levelMap[status], "backlink.check", msgMap[status], { articleId, articleUrl: article.articleUrl, status, httpCode, redirectUrl, isDofollow });

  await prisma.backlinkCheck.create({
    data: { articleId, status, httpCode, redirectUrl, isDofollow },
  });
}
