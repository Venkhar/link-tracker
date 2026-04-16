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
    // Français
    'button:has-text("Tout accepter")',
    'button:has-text("Accepter tout")',
    'button:has-text("J\'accepte")',
    // Anglais
    'button:has-text("Accept all")',
    'button:has-text("I agree")',
    // Allemand (serveur DE)
    'button:has-text("Alle akzeptieren")',
    'button:has-text("Alle annehmen")',
    'button:has-text("Ich stimme zu")',
    'button:has-text("Zustimmen")',
    // Espagnol
    'button:has-text("Aceptar todo")',
    // Néerlandais
    'button:has-text("Alles accepteren")',
    // Italien
    'button:has-text("Accetta tutto")',
    // IDs et aria-labels génériques
    "[id='L2AGLb']",
    "[aria-label='Tout accepter']",
    "[aria-label='Accept all']",
    "[aria-label='Alle akzeptieren']",
    "form[action*='consent'] button",
    "form[action*='save'] button[type='submit']",
    "form button[value='1']",
    // Overlay/dialog de consentement
    "div[aria-modal='true'] button:has-text('Tout accepter')",
    "div[aria-modal='true'] button:has-text('Accept all')",
    "div[aria-modal='true'] button:has-text('Alle akzeptieren')",
    "#dialog button:has-text('Tout accepter')",
    "#dialog button:has-text('Alle akzeptieren')",
  ];

  for (const sel of candidates) {
    try {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 1_500 })) {
        appLog("INFO", "indexation.consent", `Bouton de consentement trouvé : ${sel}`, { selector: sel, url: page.url() });
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

  appLog("WARN", "indexation.consent", "Aucun bouton de consentement trouvé", { url: page.url() });
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

/**
 * Ouvre Google, tape la requête site:URL, et analyse la SERP.
 * Retourne le statut d'indexation détecté.
 */
async function performGoogleSearch(
  articleId: string,
  articleUrl: string,
  useProxy: boolean
): Promise<"INDEXED" | "NOT_INDEXED" | "UNKNOWN"> {
  const browser = await getBrowser();
  const proxy = useProxy ? await getProxyConfig() : undefined;
  const ua = randomUserAgent();

  appLog("INFO", "indexation.check", `Début vérification indexation`, {
    articleId, url: articleUrl, proxy: proxy ? "oui" : "non (direct)",
  });

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
    const searchQuery = `site:${articleUrl}`;

    // ── Étape 1 : aller sur Google comme un humain ─────────────────
    await page.goto("https://www.google.fr", {
      waitUntil: "domcontentloaded",
      timeout: 20_000,
    });
    await sleep(1_500 + Math.random() * 1_500);

    // ── Étape 2 : gérer le consentement RGPD ──────────────────────
    await handleConsentPage(page);
    await sleep(500 + Math.random() * 500);

    // ── Étape 3 : trouver le champ de recherche et taper la requête ─
    const searchSelectors = [
      'textarea[name="q"]',
      'input[name="q"]',
      'textarea[title="Rechercher"]',
      'textarea[title="Search"]',
      'textarea[title="Suche"]',
      'input[title="Rechercher"]',
      'input[title="Search"]',
      'input[title="Suche"]',
      "[aria-label='Rech. Google']",
      "[aria-label='Rechercher']",
      "[aria-label='Search']",
      "[aria-label='Suche']",
    ];

    let searchFieldFound = false;
    for (const sel of searchSelectors) {
      try {
        const field = page.locator(sel).first();
        if (await field.isVisible({ timeout: 3_000 })) {
          await humanType(page, sel, searchQuery);
          searchFieldFound = true;
          break;
        }
      } catch {
        // Suivant
      }
    }

    if (!searchFieldFound) {
      appLog("WARN", "indexation.check", "Champ de recherche non trouvé, fallback navigation directe", { articleId, url: articleUrl });
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

    if (currentUrl.includes("/sorry/") || currentUrl.includes("sorry.google")) {
      appLog("WARN", "indexation.check", "IP bloquée par Google (page sorry)", { articleId, url: articleUrl, serpUrl: currentUrl });
      return "UNKNOWN";
    }

    // ── Détection CAPTCHA ─────────────────────────────────────────
    const hasCaptcha =
      (await page.locator('iframe[src*="recaptcha"], form[action*="/sorry/"]').count()) > 0;
    if (hasCaptcha) {
      appLog("WARN", "indexation.check", "CAPTCHA détecté par Google", { articleId, url: articleUrl, serpUrl: currentUrl });
      return "UNKNOWN";
    }

    // ── Comportement humain : scroll léger ────────────────────────
    await page.mouse.wheel(0, 150 + Math.random() * 200);
    await sleep(500 + Math.random() * 700);

    // Attend le contenu principal
    await page
      .waitForSelector("#search, #rso, #topstuff, #main, #center_col, #rcnt, #botstuff", {
        timeout: 10_000,
      })
      .catch(() => {});

    // ── Analyse des résultats ─────────────────────────────────────
    const pageText = (await page.textContent("body")) ?? "";
    const lowerText = pageText.toLowerCase();

    // Détection "aucun résultat" (multilingue)
    const noResultSignals = [
      "n'a renvoyé aucun résultat",
      "n'a donné aucun résultat",
      "did not match any documents",
      "did not match any document",
      "aucun document ne correspond",
      "aucun résultat trouvé",
      "no results found",
      "0 résultat",
      "keine ergebnisse",
      "hat keine ergebnisse ergeben",
      "keine übereinstimmung",
    ];
    const isNoResult = noResultSignals.some((s) => lowerText.includes(s.toLowerCase()));

    if (isNoResult) {
      appLog("INFO", "indexation.check", `Page non indexée (aucun résultat Google)`, { articleId, url: articleUrl });
      return "NOT_INDEXED";
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
      appLog("INFO", "indexation.check", `Page indexée (${resultCount} résultat(s) Google)`, { articleId, url: articleUrl, resultCount });
      return "INDEXED";
    }

    // Fallback texte : le hostname de l'article apparaît dans la page
    const articleHostname = (() => {
      try { return new URL(articleUrl).hostname; } catch { return ""; }
    })();
    if (articleHostname && lowerText.includes(articleHostname.toLowerCase())) {
      appLog("INFO", "indexation.check", `Page indexée (hostname trouvé dans le texte, fallback)`, { articleId, url: articleUrl, hostname: articleHostname });
      return "INDEXED";
    }

    // On est sur la SERP mais aucun résultat → page non indexée
    if (currentUrl.includes("google.fr/search") || currentUrl.includes("google.com/search")) {
      appLog("INFO", "indexation.check", `Page non indexée (SERP sans résultat)`, { articleId, url: articleUrl, serpUrl: currentUrl });
      return "NOT_INDEXED";
    }

    appLog("WARN", "indexation.check", `État indéterminé — URL inattendue après recherche`, { articleId, url: articleUrl, serpUrl: currentUrl });
    return "UNKNOWN";
  } finally {
    await context.close();
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

  try {
    // Essai 1 : avec proxy (si configuré)
    try {
      status = await performGoogleSearch(articleId, article.articleUrl, true);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      appLog("ERROR", "indexation.check", `Erreur avec proxy`, { articleId, url: article.articleUrl, error: errorMsg });
      status = "UNKNOWN";
    }

    // Essai 2 : si échec avec proxy, réessaie sans proxy
    if (status === "UNKNOWN") {
      const hasProxy = !!(await getProxyConfig());
      if (hasProxy) {
        appLog("WARN", "indexation.check", "Échec avec proxy, retry sans proxy", { articleId, url: article.articleUrl });
        await sleep(2_000 + Math.random() * 2_000);
        try {
          status = await performGoogleSearch(articleId, article.articleUrl, false);
        } catch (err2) {
          const errorMsg = err2 instanceof Error ? err2.message : String(err2);
          appLog("ERROR", "indexation.check", `Erreur sans proxy également`, { articleId, url: article.articleUrl, error: errorMsg });
          status = "UNKNOWN";
        }
      }
    }
  } finally {
    release();
  }

  await prisma.indexationCheck.create({
    data: { articleId, status, source: "SCRAPING" },
  });
}
