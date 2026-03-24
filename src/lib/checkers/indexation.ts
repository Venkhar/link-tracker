/**
 * Vérification d'indexation Google via Playwright.
 *
 * Stratégie : requête "site:URL_DE_L_ARTICLE" sur Google.
 *  - Des résultats existent → INDEXED
 *  - "Aucun résultat" → NOT_INDEXED
 *  - CAPTCHA / erreur réseau → UNKNOWN (on réessaiera plus tard)
 *
 * Anti-détection :
 *  - Stealth plugin (fingerprint réaliste, navigator.webdriver = false)
 *  - File d'attente globale : 1 requête à la fois + délai 6-11s
 *  - Viewport aléatoire + locale fr-FR
 *  - Scroll humain avant lecture des résultats
 *  - Acceptation automatique du bandeau cookie Google
 */
import { prisma } from "@/lib/prisma";
import { getBrowser, randomViewport } from "@/lib/browser/instance";
import { acquireGoogleSlot } from "@/lib/browser/google-queue";

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export async function checkIndexation(articleId: string): Promise<void> {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: { articleUrl: true },
  });
  if (!article) return;

  // Attend son tour dans la file (1 requête Google à la fois)
  const release = await acquireGoogleSlot();

  let status: "INDEXED" | "NOT_INDEXED" | "UNKNOWN" = "UNKNOWN";

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
    const query = encodeURIComponent(`site:${article.articleUrl}`);
    await page.goto(`https://www.google.fr/search?q=${query}&hl=fr&num=5`, {
      waitUntil: "domcontentloaded",
      timeout: 25_000,
    });

    // ── Bandeau cookie Google ──────────────────────────────────────
    try {
      const acceptBtn = page.locator(
        'button:has-text("Tout accepter"), button:has-text("Accepter tout"), button:has-text("J\'accepte")'
      );
      if (await acceptBtn.first().isVisible({ timeout: 3_000 })) {
        await acceptBtn.first().click();
        await sleep(800 + Math.random() * 700);
      }
    } catch {
      /* Pas de bandeau → on continue */
    }

    // ── Détection CAPTCHA ──────────────────────────────────────────
    const isCaptcha =
      (await page
        .locator(
          'iframe[src*="recaptcha"], #captcha-form, form[action*="/sorry/"]'
        )
        .count()) > 0;

    if (isCaptcha) {
      // On ne peut pas contourner le CAPTCHA → UNKNOWN, on réessaiera
      status = "UNKNOWN";
      return;
    }

    // ── Comportement humain : scroll léger ────────────────────────
    await page.mouse.wheel(0, 150 + Math.random() * 250);
    await sleep(600 + Math.random() * 800);

    // Attend que le bloc de résultats (ou "aucun résultat") soit chargé
    await page
      .waitForSelector("#search, #topstuff, #rcnt", { timeout: 10_000 })
      .catch(() => {});

    // ── Lecture des résultats ──────────────────────────────────────
    const pageText = (await page.textContent("body")) ?? "";

    const noResultSignals = [
      "n'a renvoyé aucun résultat",
      "did not match any documents",
      "aucun résultat",
      "no results found",
    ];
    const isNoResult = noResultSignals.some((s) =>
      pageText.toLowerCase().includes(s.toLowerCase())
    );

    if (isNoResult) {
      status = "NOT_INDEXED";
    } else {
      // Compte les résultats organiques dans #search
      const resultCount = await page.locator("#search .g, #rso .g").count();
      if (resultCount > 0) {
        status = "INDEXED";
      } else {
        // Page chargée mais ni résultats ni "aucun résultat" détecté
        // → pourrait être un changement de layout Google : on marque UNKNOWN
        status = "UNKNOWN";
      }
    }
  } catch {
    status = "UNKNOWN";
  } finally {
    await context.close();
    // Libère le slot pour le prochain check en attente
    release();
  }

  await prisma.indexationCheck.create({
    data: { articleId, status, source: "SCRAPING" },
  });
}
