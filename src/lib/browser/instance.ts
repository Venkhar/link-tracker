/**
 * Singleton Playwright browser avec stealth plugin.
 *
 * On réutilise la même instance entre les requêtes Next.js pour éviter
 * de lancer un nouveau Chromium à chaque vérification.
 * Si le browser crash, il est relancé automatiquement au prochain appel.
 */
import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { Browser } from "playwright";

// Active le stealth une seule fois
chromium.use(StealthPlugin());

let browser: Browser | null = null;

/** Viewports courants pour paraître humain */
const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 1280, height: 800 },
];

export function randomViewport() {
  return VIEWPORTS[Math.floor(Math.random() * VIEWPORTS.length)];
}

export async function getBrowser(): Promise<Browser> {
  if (browser?.isConnected()) return browser;

  browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-blink-features=AutomationControlled",
      "--disable-infobars",
      "--no-first-run",
      "--disable-gpu",
    ],
  });

  // Nettoyage propre à l'arrêt du process
  const cleanup = () => {
    browser?.close().catch(() => {});
    browser = null;
  };
  process.once("exit", cleanup);
  process.once("SIGINT", cleanup);
  process.once("SIGTERM", cleanup);

  return browser;
}
