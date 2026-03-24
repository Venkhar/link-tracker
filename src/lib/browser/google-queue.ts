/**
 * File d'attente globale pour les requêtes Google.
 *
 * Google ban/CAPTCHA agressivement les bots :
 *  - 1 seule requête à la fois (pas de parallélisme sur Google)
 *  - Délai minimum 6s + jitter aléatoire 0-5s entre chaque requête
 *  - → fenêtre effective : 6 à 11 secondes entre deux recherches
 */

const MIN_DELAY_MS = 6_000;
const MAX_JITTER_MS = 5_000;

let busy = false;
let lastRequest = 0;
const waiters: Array<() => void> = [];

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

/**
 * Acquiert le slot Google.
 * Retourne une fonction `release()` à appeler quand la requête est terminée.
 */
export async function acquireGoogleSlot(): Promise<() => void> {
  // Si un autre check est en cours, on attend qu'il libère
  if (busy) {
    await new Promise<void>((resolve) => waiters.push(resolve));
  }

  busy = true;

  // Enforce le délai minimum depuis la dernière requête
  const elapsed = Date.now() - lastRequest;
  const jitter = Math.random() * MAX_JITTER_MS;
  const wait = Math.max(0, MIN_DELAY_MS + jitter - elapsed);
  if (lastRequest > 0 && wait > 0) await sleep(wait);

  lastRequest = Date.now();

  return function release() {
    busy = false;
    const next = waiters.shift();
    if (next) next();
  };
}
