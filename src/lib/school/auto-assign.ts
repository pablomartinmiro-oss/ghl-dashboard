import { prisma } from "@/lib/db";

export interface AutoAssignParams {
  date: Date;
  startTime: string;
  endTime: string;
  language?: string;
  specialty?: string;
  studentLevel?: string;
}

export interface RankedInstructor {
  id: string;
  firstName: string;
  lastName: string;
  level: string | null;
  languages: string[];
  specialties: string[];
  score: number;
  reasons: string[];
  lessonsThatDay: number;
}

const LEVEL_RANK: Record<string, number> = { td1: 1, td2: 2, td3: 3 };

function hhmmToMin(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function timeOverlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return hhmmToMin(aStart) < hhmmToMin(bEnd) && hhmmToMin(bStart) < hhmmToMin(aEnd);
}

export async function findBestInstructor(
  tenantId: string,
  params: AutoAssignParams,
): Promise<RankedInstructor[]> {
  const dayStart = new Date(params.date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setHours(23, 59, 59, 999);

  const instructors = await prisma.instructor.findMany({
    where: { tenantId, status: "active" },
    include: {
      availability: { where: { date: { gte: dayStart, lte: dayEnd } } },
      lessons: {
        where: {
          date: { gte: dayStart, lte: dayEnd },
          status: { in: ["scheduled", "confirmed", "in_progress"] },
        },
        select: { id: true, startTime: true, endTime: true },
      },
    },
  });

  const minLevelRank = params.studentLevel === "expert" ? 2 : 1;
  const ranked: RankedInstructor[] = [];

  for (const ins of instructors) {
    const reasons: string[] = [];
    let score = 0;

    const langs = (Array.isArray(ins.languages) ? ins.languages : []) as string[];
    const specs = (Array.isArray(ins.specialties) ? ins.specialties : []) as string[];

    const availabilityRecord = ins.availability.find(
      (a) => a.isAvailable && hhmmToMin(a.startTime) <= hhmmToMin(params.startTime) && hhmmToMin(a.endTime) >= hhmmToMin(params.endTime),
    );
    const explicitlyUnavailable = ins.availability.some((a) => !a.isAvailable);
    if (explicitlyUnavailable && !availabilityRecord) continue;

    const conflict = ins.lessons.some((l) => timeOverlaps(params.startTime, params.endTime, l.startTime, l.endTime));
    if (conflict) continue;

    if (availabilityRecord) {
      score += 30;
      reasons.push("Disponible explícitamente");
    } else {
      score += 10;
      reasons.push("Sin conflictos");
    }

    if (params.language) {
      if (langs.includes(params.language)) {
        score += 25;
        reasons.push(`Habla ${params.language}`);
      } else {
        continue;
      }
    }

    if (params.specialty) {
      if (specs.includes(params.specialty)) {
        score += 20;
        reasons.push(`Especialidad ${params.specialty}`);
      } else {
        score -= 5;
      }
    }

    const insLevelRank = ins.level ? LEVEL_RANK[ins.level] ?? 0 : 0;
    if (insLevelRank >= minLevelRank) {
      score += insLevelRank * 5;
    } else if (params.studentLevel === "expert") {
      continue;
    }

    const lessonsThatDay = ins.lessons.length;
    score -= lessonsThatDay * 3;
    if (lessonsThatDay === 0) reasons.push("Sin clases ese día");

    ranked.push({
      id: ins.id,
      firstName: ins.firstName,
      lastName: ins.lastName,
      level: ins.level,
      languages: langs,
      specialties: specs,
      score,
      reasons,
      lessonsThatDay,
    });
  }

  return ranked.sort((a, b) => b.score - a.score);
}
