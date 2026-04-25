import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "groups:auto-size" });

// Standard ski-length sizing rule of thumb:
// - beginner/intermediate: ski length ≈ height - 15cm
// - advanced/expert: ski length ≈ height - 5cm
function suggestSkiLength(heightCm: number, level: string | null): number {
  const offset = level === "advanced" || level === "expert" ? 5 : 15;
  return heightCm - offset;
}

// Boot size from EU shoe size (already EU). Default fallback if missing.
function normaliseBootSize(shoeSize: string | null): string | null {
  if (!shoeSize) return null;
  const trimmed = shoeSize.trim();
  if (!trimmed) return null;
  return trimmed;
}

// Helmet sizing: head circumference is rarely captured, so we approximate from age.
function suggestHelmetSize(age: number | null): "S" | "M" | "L" | null {
  if (age === null) return null;
  if (age <= 8) return "S";
  if (age <= 14) return "M";
  return "L";
}

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;
  const { id } = await ctx.params;

  try {
    const group = await prisma.groupBooking.findFirst({
      where: { id, tenantId },
      include: { members: true },
    });
    if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const assignments = group.members.map((m) => {
      const skiLength = m.heightCm ? suggestSkiLength(m.heightCm, m.skiLevel) : null;
      const bootSize = normaliseBootSize(m.shoeSize);
      const helmetSize = suggestHelmetSize(m.age);
      return {
        memberId: m.id,
        name: m.name,
        heightCm: m.heightCm,
        age: m.age,
        skiLevel: m.skiLevel,
        skiLengthCm: skiLength,
        bootSize,
        helmetSize,
      };
    });

    const summary = {
      total: assignments.length,
      withSki: assignments.filter((a) => a.skiLengthCm !== null).length,
      withBoots: assignments.filter((a) => a.bootSize !== null).length,
      withHelmet: assignments.filter((a) => a.helmetSize !== null).length,
      missingHeight: assignments.filter((a) => a.heightCm === null).length,
      missingShoe: assignments.filter((a) => a.bootSize === null).length,
    };

    log.info({ tenantId, groupId: id, summary }, "Auto-size run");
    return NextResponse.json({ assignments, summary });
  } catch (error) {
    log.error({ error, tenantId, id }, "Failed to auto-size group");
    return NextResponse.json({ error: "Failed to auto-size group" }, { status: 500 });
  }
}
