import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { Prisma } from "@/generated/prisma/client";

const log = logger.child({ path: "/api/checkout/payments" });

const STATUSES = ["pending", "processing", "succeeded", "failed", "refunded", "cancelled"];
const PROVIDERS = ["redsys", "stripe", "manual"];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = session.user;

  try {
    const { searchParams } = req.nextUrl;
    const status = searchParams.get("status");
    const provider = searchParams.get("provider");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("pageSize") ?? "50", 10) || 50)
    );

    const where: Prisma.PaymentIntentWhereInput = { tenantId };
    if (status && STATUSES.includes(status)) where.status = status;
    if (provider && PROVIDERS.includes(provider)) where.provider = provider;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) (where.createdAt as Prisma.DateTimeFilter).gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        (where.createdAt as Prisma.DateTimeFilter).lte = end;
      }
    }

    const [total, payments, statsAggregate] = await Promise.all([
      prisma.paymentIntent.count({ where }),
      prisma.paymentIntent.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.paymentIntent.groupBy({
        by: ["status"],
        where: { tenantId },
        _sum: { amountCents: true },
        _count: true,
      }),
    ]);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayCount = await prisma.paymentIntent.count({
      where: { tenantId, createdAt: { gte: startOfToday } },
    });

    const stats = {
      revenueCents: statsAggregate
        .filter((s) => s.status === "succeeded")
        .reduce((sum, s) => sum + (s._sum.amountCents ?? 0), 0),
      pending: statsAggregate.find((s) => s.status === "pending")?._count ?? 0,
      refunded: statsAggregate.find((s) => s.status === "refunded")?._count ?? 0,
      today: todayCount,
    };

    return NextResponse.json({
      payments,
      pagination: { total, page, pageSize, pages: Math.ceil(total / pageSize) },
      stats,
    });
  } catch (error) {
    log.error({ error, tenantId }, "List payments failed");
    return NextResponse.json({ error: "Error al obtener pagos" }, { status: 500 });
  }
}
