import { prisma } from "@/lib/prisma";

type LogLevel = "INFO" | "WARN" | "ERROR";

/**
 * Enregistre un log applicatif en base.
 * Fire-and-forget : n'attend pas et ne bloque jamais l'appelant.
 */
export function appLog(
  level: LogLevel,
  action: string,
  message: string,
  details?: Record<string, unknown>
) {
  const detailsJson = details ? JSON.stringify(details) : null;

  // Fire-and-forget — on ne veut pas ralentir les checks
  prisma.appLog
    .create({
      data: { level, action, message, details: detailsJson },
    })
    .catch((err: unknown) => {
      console.error("[appLog] Failed to write log:", err);
    });
}
