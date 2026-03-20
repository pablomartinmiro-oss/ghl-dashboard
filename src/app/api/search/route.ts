import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";

/**
 * GET /api/search?q=term
 * Global search across contacts, reservations, and quotes.
 * Returns max 5 results per category.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = session.user.tenantId;
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json({ contacts: [], reservations: [], quotes: [] });
  }

  const [contacts, reservations, quotes] = await Promise.all([
    prisma.cachedContact.findMany({
      where: {
        tenantId,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, email: true, phone: true },
      take: 5,
      orderBy: { updatedAt: "desc" },
    }),

    prisma.reservation.findMany({
      where: {
        tenantId,
        OR: [
          { clientName: { contains: q, mode: "insensitive" } },
          { clientEmail: { contains: q, mode: "insensitive" } },
          { clientPhone: { contains: q, mode: "insensitive" } },
          { couponCode: { contains: q, mode: "insensitive" } },
          { station: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, clientName: true, station: true, status: true, activityDate: true },
      take: 5,
      orderBy: { createdAt: "desc" },
    }),

    prisma.quote.findMany({
      where: {
        tenantId,
        OR: [
          { clientName: { contains: q, mode: "insensitive" } },
          { clientEmail: { contains: q, mode: "insensitive" } },
          { destination: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, clientName: true, destination: true, status: true, totalAmount: true },
      take: 5,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({ contacts, reservations, quotes });
}
