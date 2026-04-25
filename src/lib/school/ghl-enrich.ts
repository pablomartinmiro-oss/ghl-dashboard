import { prisma } from "@/lib/db";
import { getGHLClient } from "@/lib/ghl/api";
import { syncContactFields } from "@/lib/ghl/field-sync";
import { logger } from "@/lib/logger";

const log = logger.child({ layer: "school-ghl-enrich" });

export interface LessonEnrichmentInput {
  email: string;
  name: string;
  level: string | null;
  date: Date;
}

export async function enrichLessonContact(tenantId: string, input: LessonEnrichmentInput): Promise<void> {
  try {
    const cached = await prisma.cachedContact.findFirst({
      where: { tenantId, email: input.email },
    });

    let contactId = cached?.id;
    let existingTags: string[] = Array.isArray(cached?.tags) ? (cached!.tags as string[]) : [];

    if (!contactId) {
      try {
        const ghl = await getGHLClient(tenantId);
        const created = await ghl.createContact({
          email: input.email,
          firstName: input.name.split(" ")[0],
          lastName: input.name.split(" ").slice(1).join(" ") || undefined,
          tags: ["alumno-escuela"],
        });
        contactId = created.id;
      } catch (err) {
        log.warn({ tenantId, email: input.email, error: err }, "Could not create GHL contact for lesson");
        return;
      }
    }

    if (!contactId) return;

    const progress = await prisma.studentProgress.findUnique({
      where: { tenantId_customerEmail: { tenantId, customerEmail: input.email } },
    });

    const dateIso = input.date.toISOString().split("T")[0];
    await syncContactFields(tenantId, contactId, {
      last_lesson_date: dateIso,
      student_level: input.level ?? progress?.currentLevel ?? "beginner",
      total_lessons: progress?.totalLessons ?? 1,
    });

    const newTags = Array.from(
      new Set([...existingTags, "alumno-escuela", `nivel-${input.level ?? progress?.currentLevel ?? "beginner"}`]),
    );
    try {
      const ghl = await getGHLClient(tenantId);
      await ghl.updateContact(contactId, { tags: newTags });
    } catch (err) {
      log.warn({ tenantId, contactId, error: err }, "Failed to update tags on lesson enrichment");
    }
  } catch (err) {
    log.error({ tenantId, email: input.email, error: err }, "Lesson enrichment failed");
  }
}
