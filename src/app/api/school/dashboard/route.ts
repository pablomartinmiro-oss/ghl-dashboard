import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "school:dashboard" });

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = session.user.tenantId;
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const [activeInstructors, lessonsToday, monthLessons] = await Promise.all([
      prisma.instructor.count({ where: { tenantId, status: "active" } }),
      prisma.lessonBooking.findMany({ where: { tenantId, date: { gte: today, lt: tomorrow } } }),
      prisma.lessonBooking.findMany({ where: { tenantId, date: { gte: monthStart }, status: { in: ["completed","confirmed"] } } }),
    ]);
    const studentsToday = lessonsToday.reduce((s,l) => s + l.currentStudents, 0);
    const monthRevenueCents = monthLessons.reduce((s,l) => s + l.priceCents, 0);
    return NextResponse.json({ activeInstructors, lessonsToday: lessonsToday.length, studentsToday, monthRevenueCents });
  } catch (e) { log.error(e); return NextResponse.json({ error: "Server error" }, { status: 500 }); }
}
