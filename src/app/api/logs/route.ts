import { NextRequest, NextResponse } from "next/server";
import { getSessionOrUnauthorized } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/logs?level=ERROR&action=indexation&limit=100&cursor=xxx
 *
 * Retourne les logs applicatifs paginés (cursor-based).
 */
export async function GET(req: NextRequest) {
  const { error } = await getSessionOrUnauthorized();
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const level = searchParams.get("level") || undefined;
  const action = searchParams.get("action") || undefined;
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 200);
  const cursor = searchParams.get("cursor") || undefined;

  const logs = await prisma.appLog.findMany({
    where: {
      ...(level ? { level: level as "INFO" | "WARN" | "ERROR" } : {}),
      ...(action ? { action: { contains: action } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = logs.length > limit;
  if (hasMore) logs.pop();

  return NextResponse.json({
    logs,
    nextCursor: hasMore ? logs[logs.length - 1]?.id : null,
  });
}

/**
 * DELETE /api/logs — Purge tous les logs
 */
export async function DELETE() {
  const { error, session } = await getSessionOrUnauthorized();
  if (error) return error;

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin requis" }, { status: 403 });
  }

  const { count } = await prisma.appLog.deleteMany();
  return NextResponse.json({ deleted: count });
}
