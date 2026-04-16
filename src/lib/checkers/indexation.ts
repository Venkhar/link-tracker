/**
 * Vérification d'indexation Google via Playwright.
 *
 * Logique : "site:URL_DE_L_ARTICLE" sur Google.fr
 *  - Des résultats existent → INDEXED
 *  - "Aucun résultat" détecté → NOT_INDEXED
 *  - CAPTCHA / ban IP / erreur réseau → UNKNOWN
 *
 * Anti-ban :
 *  - Stealth plugin (fingerprint réaliste)
 *  - Approche "humaine" : visite google.fr → tape la requête → Enter
 *  - User-agent réaliste rotatif
 *  - File d'attente : 1 requête à la fois + délai 6-11 s aléatoire
 *  - Gestion automatique page consentement RGPD Google (overlay ou redirect)
 */
import { prisma } from "@/lib/prisma";
import { getBrowser, randomViewport, getProxyConfig } from "@/lib/browser/instance";
import { acquireGoogleSlot } from "@/lib/browser/google-queue";
import { appLog } from "@/lib/logger";

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

/** User-agents récents et réalistes (Chrome desktop) */
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
];

function randomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Accepte la page de consentement RGPD Google si elle apparaît.
 * Gère overlay, modal, et redirect vers consent.google.com.
 */
async function handleConsentPage(page: import("playwright").Page): Promise<void> {
  const candidates = [
    'button:has-text("Tout accepter")',
    'button:has-text("Accepter tout")',
    'button:has-text("Accept all")',
    'button:has-text("J\'accepte")',
    'button:has-text("I agree")',
    "[id='L2AGLb']",
    "[aria-label='Tout accepter']",
    "[aria-label='Accept all']",
    "form[action*='consent'] button",
    "form[action*='save'] button[type='submit']",
    "form button[value='1']",
    "div[aria-modal='true'] button:has-text('Tout accepter')",
    "div[aria-modal='true'] button:has-text('Accept all')",
    "#dialog button:has-text('Tout accepter')",
  ];

  for (const sel of candidates) {
    try {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 1_500 })) {
        console.log(`[indexation] Consent button found: ${sel}`);
        await btn.click();
        await sleep(2_000 + Math.random() * 1_000);
        // Si on était sur consent.google.com, attend le retour
        if (page.url().includes("consent.google") || page.url().includes("accounts.google")) {
          await page.waitForURL(/google\.(fr|com)/, { timeout: 8_000 }).catch(() => {});
        }
        return;
      }
    } catch {
      // Sélecteur non trouvé → suivant
    }
  }
}

/**
 * Tape le texte caractère par caractère avec un délai humain.
 */
async function humanType(page: import("playwright").Page, selector: string, text: string) {
  await page.click(selector);
  await sleep(200 + Math.random() * 300);
  for (const char of text) {
    await page.keyboard.type(char, { delay: 50 + Math.random() * 120 });
  }
}

export async function checkIndexation(articleId: string): Promise<void> {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: { articleUrl: true },
  });
  if (!article) return;

  // Attend son tour (1 requête Google à la fois, 6-11 s entre chaque)
  const release = await acquireGoogleSlot();

  let status: "INDEXED" | "NOT_INDEXED" | "UNKNOWN" = "UNKNOWN";

  const browser = await getBrowser();
  const proxy = await getProxyConfig();
  const ua = randomUserAgent();
  const context = await browser.newContext({
    viewport: randomViewport(),
    locale: "fr-FR",
    userAgent: ua,
    extraHTTPHeaders: {
      "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
    },
    ...(proxy ? { proxy } : {}),
  });
  const page = await context.newPage();

  try {
    const searchQuery = `site:${article.articleUrl}`;
    appLog("INFO", "indexation.check", `Début vérification indexation`, { articleId, url: article.articleUrl, query: searchQuery });

    // ── Étape 1 : aller sur Google.fr comme un humain ──────────────
    await page.goto("https://www.google.fr", {
      waitUntil: "domcontentloaded",
      timeout: 20_000,
    });
    await sleep(1_500 + Math.random() * 1_500);

    // ── Étape 2 : gérer le consentement RGPD ──────────────────────
    await handleConsentPage(page);
    await sleep(500 + Math.random() * 500);

    // ── Étape 3 : trouver le champ de recherche et taper la requête ─
    // Google utilise textarea ou input pour le champ de recherche
    const searchSelectors = [
      'textarea[name="q"]',
      'input[name="q"]',
      'textarea[title="Rechercher"]',
      'textarea[title="Search"]',
      'input[title="Rechercher"]',
      'input[title="Search"]',
      "[aria-label='Rech. Google']",
      "[aria-label='Rechercher']",
      "[aria-label='Search']",
    ];

    let searchFieldFound = false;
    for (const sel of searchSelectors) {
      try {
        const field = page.locator(sel).first();
        if (await field.isVisible({ timeout: 3_000 })) {
          console.log(`[indexation] Search field found: ${sel}`);
          await humanType(page, sel, searchQuery);
          searchFieldFound = true;
          break;
        }
      } catch {
        // Suivant
      }
    }

    if (!searchFieldFound) {
      console.error("[indexation] Search field not found on Google homepage");
      // Fallback : navigation directe
      const query = encodeURIComponent(searchQuery);
      await page.goto(`https://www.google.fr/search?q=${query}&hl=fr`, {
        waitUntil: "domcontentloaded",
        timeout: 20_000,
      });
      await sleep(2_000 + Math.random() * 1_000);
      await handleConsentPage(page);
    }

    if (searchFieldFound) {
      // ── Étape 4 : appuyer sur Entrée et attendre les résultats ───
      await sleep(300 + Math.random() * 500);
      await page.keyboard.press("Enter");
      await page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 15_000 }).catch(() => {});
      await sleep(2_000 + Math.random() * 1_500);
    }

    // ── Détection ban IP / page Sorry ─────────────────────────────
    const currentUrl = page.url();
    console.log(`[indexation] SERP URL: ${currentUrl}`);

    if (currentUrl.includes("/sorry/") || currentUrl.includes("sorry.google")) {
      appLog("WARN", "indexation.check", "IP bloquée par Google (page sorry)", { articleId, url: article.articleUrl, serpUrl: currentUrl });
      status = "UNKNOWN";
      return;
    }

    // ── Détection CAPTCHA ─────────────────────────────────────────
    const hasCaptcha =
      (await page.locator('iframe[src*="recaptcha"], form[action*="/sorry/"]').count()) > 0;
    if (hasCaptcha) {
      appLog("WARN", "indexation.check", "CAPTCHA détecté par Google", { articleId, url: article.articleUrl, serpUrl: currentUrl });
      status = "UNKNOWN";
      return;
    }

    // ── Comportement humain : scroll léger ────────────────────────
    await page.mouse.wheel(0, 150 + Math.random() * 200);
    await sleep(500 + Math.random() * 700);

    // Attend le contenu principal
    await page
      .waitForSelector("#search, #rso, #topstuff, #main, #center_col, #rcnt, #botstuff", {
        timeout: 10_000,
      })
      .catch(() => {
        console.warn("[indexation] Main content selector not found within 10s");
      });

    // ── Analyse des résultats ─────────────────────────────────────
    const pageText = (await page.textContent("body")) ?? "";
    const lowerText = pageText.toLowerCase();

    // Détection "aucun résultat"
    const noResultSignals = [
      "n'a renvoyé aucun résultat",
      "n'a donné aucun résultat",
      "did not match any documents",
      "did not match any document",
      "aucun document ne correspond",
      "aucun résultat trouvé",
      "no results found",
      "0 résultat",
    ];
    const isNoResult = noResultSignals.some((s) => lowerText.includes(s.toLowerCase()));

    if (isNoResult) {
      appLog("INFO", "indexation.check", `Page non indexée (aucun résultat Google)`, { articleId, url: article.articleUrl });
      status = "NOT_INDEXED";
      return;
    }

    // Détection résultats organiques (sélecteurs larges)
    const resultSelectors = [
      "#search .g",
      "#rso .g",
      "#rso > div > div",
      ".MjjYud",
      "div[data-hveid]",
      "#rso div[data-snc]",
      "div.g[data-hveid]",
      "#center_col .g",
    ].join(", ");

    const resultCount = await page.locator(resultSelectors).count();

    if (resultCount > 0) {
      appLog("INFO", "indexation.check", `Page indexée (${resultCount} résultat(s) Google)`, { articleId, url: article.articleUrl, resultCount });
      status = "INDEXED";
      return;
    }

    // Fallback texte : le hostname de l'article apparaît dans la page
    const articleHostname = (() => {
      try { return new URL(article.articleUrl).hostname; } catch { return ""; }
    })();
    if (articleHostname && lowerText.includes(articleHostname.toLowerCase())) {
      appLog("INFO", "indexation.check", `Page indexée (hostname trouvé dans le texte, fallback)`, { articleId, url: article.articleUrl, hostname: articleHostname });
      status = "INDEXED";
      return;
    }

    // On est sur la SERP mais aucun résultat → page non indexée
    if (currentUrl.includes("google.fr/search") || currentUrl.includes("google.com/search")) {
      appLog("INFO", "indexation.check", `Page non indexée (SERP sans résultat)`, { articleId, url: article.articleUrl, serpUrl: currentUrl });
      status = "NOT_INDEXED";
    } else {
      appLog("WARN", "indexation.check", `État indéterminé — URL inattendue après recherche`, { articleId, url: article.articleUrl, serpUrl: currentUrl });
      status = "UNKNOWN";
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    appLog("ERROR", "indexation.check", `Erreur lors de la vérification d'indexation`, { articleId, url: article.articleUrl, error: errorMsg });
    status = "UNKNOWN";
  } finally {
    await context.close();
    release();
  }

  await prisma.indexationCheck.create({
    data: { articleId, status, source: "SCRAPING" },
  });
}
