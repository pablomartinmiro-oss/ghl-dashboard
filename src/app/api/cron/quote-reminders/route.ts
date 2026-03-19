import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { sendEmail } from "@/lib/email/client";
import { buildReminderEmailHTML } from "@/lib/email/templates";

const log = logger.child({ route: "/api/cron/quote-reminders" });
const IBAN = "ES58 0182 2900 5402 0182 7221";

/**
 * PUBLIC GET endpoint for Railway cron.
 * 1. Send reminders for quotes expiring within 2 days
 * 2. Expire quotes past their expiration date
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const now = new Date();
    const twoDaysFromNow = new Date(
      now.getTime() + 2 * 24 * 60 * 60 * 1000
    );

    // 1. Find quotes needing a reminder
    const quotesToRemind = await prisma.quote.findMany({
      where: {
        status: "enviado",
        expiresAt: {
          gt: now,
          lte: twoDaysFromNow,
        },
        reminderSentAt: null,
        clientEmail: { not: null },
      },
    });

    let remindersSent = 0;

    for (const quote of quotesToRemind) {
      if (!quote.clientEmail) continue;

      try {
        const quoteNumber = quote.id.slice(-8).toUpperCase();
        const expiresAt = quote.expiresAt
          ? new Date(quote.expiresAt).toLocaleDateString("es-ES")
          : "";

        const html = buildReminderEmailHTML({
          quoteNumber,
          clientName: quote.clientName,
          destination: quote.destination,
          totalAmount: quote.totalAmount,
          paymentUrl: quote.redsysPaymentUrl ?? undefined,
          expiresAt,
          iban: IBAN,
        });

        await sendEmail({
          tenantId: quote.tenantId,
          contactId: quote.ghlContactId ?? null,
          to: quote.clientEmail,
          subject: `Recordatorio — Presupuesto ${quoteNumber} expira pronto`,
          html,
        });

        await prisma.quote.update({
          where: { id: quote.id },
          data: {
            reminderSentAt: now,
            reminderCount: { increment: 1 },
          },
        });

        remindersSent++;
      } catch (emailError) {
        log.error(
          { error: emailError, quoteId: quote.id },
          "Failed to send reminder"
        );
      }
    }

    // 2. Expire overdue quotes
    const expiredResult = await prisma.quote.updateMany({
      where: {
        status: "enviado",
        expiresAt: { lt: now },
      },
      data: { status: "expirado" },
    });

    log.info(
      {
        remindersSent,
        expired: expiredResult.count,
        checked: quotesToRemind.length,
      },
      "Quote reminders cron completed"
    );

    return NextResponse.json({
      remindersSent,
      expired: expiredResult.count,
      checkedForReminders: quotesToRemind.length,
    });
  } catch (error) {
    log.error({ error }, "Quote reminders cron failed");
    return NextResponse.json(
      { error: "Cron job failed" },
      { status: 500 }
    );
  }
}
