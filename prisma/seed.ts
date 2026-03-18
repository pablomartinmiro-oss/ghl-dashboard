import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import { buildFullCatalog, SEASON_CALENDAR } from "../src/lib/constants/product-catalog";
import {
  DEMO_CONTACTS,
  DEMO_RESERVATIONS,
  DEMO_QUOTES,
  DEMO_DEALS,
  DEMO_CONVERSATIONS,
  DEMO_CAPACITY,
} from "../src/lib/constants/demo-seed-data";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const PERMISSIONS = {
  "comms:view": "View conversations",
  "comms:send": "Send SMS messages",
  "comms:assign": "Assign/reassign conversations",
  "pipelines:view": "View pipelines and deals",
  "pipelines:edit": "Move deals, edit deal details",
  "pipelines:create": "Create new opportunities",
  "pipelines:delete": "Delete opportunities",
  "analytics:view": "View marketing analytics",
  "analytics:export": "Export analytics data",
  "contacts:view": "View contacts",
  "contacts:edit": "Edit contacts, add notes",
  "contacts:create": "Create new contacts",
  "contacts:delete": "Delete contacts",
  "reservations:view": "View reservations",
  "reservations:create": "Create and confirm reservations",
  "reservations:edit": "Edit and cancel reservations",
  "settings:team": "Manage team members and roles",
  "settings:tenant": "Manage integrations and tenant config",
} as const;

const DEFAULT_ROLES: Record<string, string[]> = {
  "Owner / Manager": Object.keys(PERMISSIONS),
  "Sales Rep": [
    "comms:view", "comms:send", "pipelines:view", "pipelines:edit",
    "pipelines:create", "contacts:view", "reservations:view", "reservations:create",
  ],
  Marketing: ["analytics:view", "analytics:export", "contacts:view"],
  "VA / Admin": [
    "contacts:view", "contacts:edit", "contacts:create",
    "comms:view", "comms:send",
    "reservations:view", "reservations:create", "reservations:edit",
  ],
};

async function seedProducts() {
  const PRODUCTS = buildFullCatalog();
  // Global catalog — delete products with no tenant (shared across all tenants)
  await prisma.product.deleteMany({ where: { tenantId: null } });
  for (const product of PRODUCTS) {
    await prisma.product.create({
      data: {
        category: product.category,
        name: product.name,
        station: product.station,
        description: product.description ?? null,
        personType: product.personType ?? null,
        tier: product.tier ?? null,
        includesHelmet: product.includesHelmet ?? false,
        priceType: product.priceType,
        price: product.price,
        pricingMatrix: JSON.parse(JSON.stringify(product.pricingMatrix)),
        sortOrder: product.sortOrder,
        isActive: true,
      },
    });
  }
  return PRODUCTS.length;
}

async function seedSeasonCalendar(tenantId: string) {
  await prisma.seasonCalendar.deleteMany({ where: { tenantId } });
  for (const entry of SEASON_CALENDAR) {
    await prisma.seasonCalendar.create({
      data: {
        tenantId,
        station: entry.station,
        season: entry.season,
        startDate: new Date(entry.startDate),
        endDate: new Date(entry.endDate),
        label: entry.label,
      },
    });
  }
  return SEASON_CALENDAR.length;
}

async function seedDemoData(tenantId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ==================== CONTACTS (50 as CachedContacts) ====================
  await prisma.cachedContact.deleteMany({ where: { tenantId } });
  const contactIds: string[] = [];
  for (let i = 0; i < DEMO_CONTACTS.length; i++) {
    const c = DEMO_CONTACTS[i];
    const id = `demo-contact-${String(i).padStart(3, "0")}`;
    contactIds.push(id);
    await prisma.cachedContact.create({
      data: {
        id,
        tenantId,
        firstName: c.firstName,
        lastName: c.lastName,
        name: `${c.firstName} ${c.lastName}`,
        email: c.email,
        phone: c.phone,
        tags: c.tags,
        source: c.source,
        dateAdded: new Date(today.getTime() - Math.random() * 30 * 86400000),
        lastActivity: new Date(today.getTime() - Math.random() * 7 * 86400000),
        dnd: false,
        raw: {},
        cachedAt: new Date(),
      },
    });
  }
  console.log(`Seeded ${contactIds.length} demo contacts`);

  // ==================== RESERVATIONS (50) ====================
  await prisma.reservation.deleteMany({ where: { tenantId } });
  for (const r of DEMO_RESERVATIONS) {
    const c = DEMO_CONTACTS[r.contactIndex];
    const activityDate = new Date(today);
    activityDate.setDate(activityDate.getDate() + r.daysOffset);

    await prisma.reservation.create({
      data: {
        tenantId,
        ghlContactId: contactIds[r.contactIndex],
        clientName: `${c.firstName} ${c.lastName}`,
        clientPhone: c.phone,
        clientEmail: c.email,
        couponCode: r.couponCode ?? null,
        source: r.source,
        station: r.station,
        activityDate,
        schedule: r.schedule,
        totalPrice: r.totalPrice,
        status: r.status,
        paymentMethod: r.paymentMethod ?? null,
        notes: r.notes ?? null,
        services: [{ type: r.services, quantity: 1 }],
        emailSentAt: r.status === "confirmada" ? new Date() : null,
        whatsappSentAt: r.status === "confirmada" ? new Date() : null,
        notificationType: r.status === "confirmada" ? "confirmacion" : null,
        voucherCouponCode: r.couponCode ?? null,
        voucherRedeemed: r.source === "groupon" && r.status === "confirmada",
        voucherRedeemedAt:
          r.source === "groupon" && r.status === "confirmada"
            ? new Date()
            : null,
        voucherPricePaid:
          r.source === "groupon" ? r.totalPrice : null,
      },
    });
  }
  console.log(`Seeded ${DEMO_RESERVATIONS.length} demo reservations`);

  // ==================== QUOTES (12) ====================
  await prisma.quote.deleteMany({ where: { tenantId } });
  for (const q of DEMO_QUOTES) {
    const c = DEMO_CONTACTS[q.contactIndex];
    const checkIn = new Date(today);
    checkIn.setDate(checkIn.getDate() + q.checkIn);
    const checkOut = new Date(today);
    checkOut.setDate(checkOut.getDate() + q.checkOut);

    await prisma.quote.create({
      data: {
        tenantId,
        ghlContactId: contactIds[q.contactIndex],
        clientName: `${c.firstName} ${c.lastName}`,
        clientEmail: c.email,
        clientPhone: c.phone,
        clientNotes: q.notes ?? null,
        destination: q.destination,
        checkIn,
        checkOut,
        adults: q.adults,
        children: q.children,
        wantsForfait: q.wantsForfait,
        wantsClases: q.wantsClases,
        wantsEquipment: q.wantsEquipment,
        status: q.status,
        totalAmount: q.totalAmount,
        sentAt: q.status === "enviado" || q.status === "aceptado"
          ? new Date(today.getTime() - 86400000)
          : null,
        expiresAt: new Date(today.getTime() + 14 * 86400000),
      },
    });
  }
  console.log(`Seeded ${DEMO_QUOTES.length} demo quotes`);

  // ==================== PIPELINE (25 deals) ====================
  await prisma.cachedPipeline.deleteMany({ where: { tenantId } });
  await prisma.cachedOpportunity.deleteMany({ where: { tenantId } });

  const STAGE_MAP: Record<string, { id: string; name: string; position: number }> = {
    nuevo_lead: { id: "demo-stage-1", name: "Nuevo Lead", position: 0 },
    contactado: { id: "demo-stage-2", name: "Contactado", position: 1 },
    presupuesto_enviado: { id: "demo-stage-3", name: "Presupuesto Enviado", position: 2 },
    aceptado: { id: "demo-stage-4", name: "Aceptado", position: 3 },
    cerrado: { id: "demo-stage-5", name: "Cerrado", position: 4 },
  };

  await prisma.cachedPipeline.create({
    data: {
      id: "demo-pipeline-1",
      tenantId,
      name: "Pipeline Comercial",
      stages: Object.values(STAGE_MAP),
      raw: {},
      cachedAt: new Date(),
    },
  });

  for (let i = 0; i < DEMO_DEALS.length; i++) {
    const d = DEMO_DEALS[i];
    const c = DEMO_CONTACTS[d.contactIndex];
    const stage = STAGE_MAP[d.stage];
    await prisma.cachedOpportunity.create({
      data: {
        id: `demo-opp-${String(i).padStart(3, "0")}`,
        tenantId,
        pipelineId: "demo-pipeline-1",
        pipelineStageId: stage.id,
        name: d.name,
        contactId: contactIds[d.contactIndex],
        contactName: `${c.firstName} ${c.lastName}`,
        monetaryValue: d.value,
        status: d.stage === "cerrado" ? "won" : "open",
        raw: {},
        cachedAt: new Date(),
      },
    });
  }
  console.log(`Seeded ${DEMO_DEALS.length} demo pipeline deals`);

  // ==================== CONVERSATIONS (20) ====================
  await prisma.cachedConversation.deleteMany({ where: { tenantId } });
  for (let i = 0; i < DEMO_CONVERSATIONS.length; i++) {
    const conv = DEMO_CONVERSATIONS[i];
    const c = DEMO_CONTACTS[conv.contactIndex];
    const lastMsg = conv.messages[conv.messages.length - 1];
    const lastMsgDate = new Date(Date.now() - lastMsg.minutesAgo * 60000);

    await prisma.cachedConversation.create({
      data: {
        id: `demo-conv-${String(i).padStart(3, "0")}`,
        tenantId,
        contactId: contactIds[conv.contactIndex],
        contactName: `${c.firstName} ${c.lastName}`,
        contactPhone: c.phone,
        contactEmail: c.email,
        lastMessageBody: lastMsg.body,
        lastMessageDate: lastMsgDate,
        lastMessageType: conv.type,
        unreadCount: lastMsg.direction === "inbound" ? 1 : 0,
        raw: { messages: conv.messages.map((m) => ({
          ...m,
          dateAdded: new Date(Date.now() - m.minutesAgo * 60000).toISOString(),
        }))},
        cachedAt: new Date(),
      },
    });
  }
  console.log(`Seeded ${DEMO_CONVERSATIONS.length} demo conversations`);

  // ==================== STATION CAPACITY ====================
  await prisma.stationCapacity.deleteMany({ where: { tenantId } });
  for (let d = 0; d < 7; d++) {
    const date = new Date(today);
    date.setDate(date.getDate() + d);
    for (const cap of DEMO_CAPACITY) {
      const factor = d === 0 ? 1 : 0.3 + Math.random() * 0.3;
      await prisma.stationCapacity.create({
        data: {
          tenantId,
          station: cap.station,
          date,
          serviceType: "cursillo_adulto",
          maxCapacity: cap.cursillo_max,
          booked: d === 0
            ? cap.cursillo_booked
            : Math.floor(cap.cursillo_max * factor),
        },
      });
      await prisma.stationCapacity.create({
        data: {
          tenantId,
          station: cap.station,
          date,
          serviceType: "clase_particular",
          maxCapacity: cap.clase_max,
          booked: d === 0
            ? cap.clase_booked
            : Math.floor(cap.clase_max * factor),
        },
      });
    }
  }
  console.log("Seeded station capacity");
}

async function main() {
  // ==================== DEMO TENANT ====================
  const demoTenant = await prisma.tenant.upsert({
    where: { slug: "demo" },
    update: { isDemo: true, dataMode: "mock" },
    create: {
      name: "Skicenter Demo",
      slug: "demo",
      onboardingComplete: true,
      isDemo: true,
      dataMode: "mock",
    },
  });

  const roles = {
    owner: await prisma.role.upsert({
      where: { name_tenantId: { name: "Owner / Manager", tenantId: demoTenant.id } },
      update: {},
      create: { name: "Owner / Manager", tenantId: demoTenant.id, isSystem: true, permissions: DEFAULT_ROLES["Owner / Manager"] },
    }),
    sales: await prisma.role.upsert({
      where: { name_tenantId: { name: "Sales Rep", tenantId: demoTenant.id } },
      update: {},
      create: { name: "Sales Rep", tenantId: demoTenant.id, isSystem: true, permissions: DEFAULT_ROLES["Sales Rep"] },
    }),
    marketing: await prisma.role.upsert({
      where: { name_tenantId: { name: "Marketing", tenantId: demoTenant.id } },
      update: {},
      create: { name: "Marketing", tenantId: demoTenant.id, isSystem: true, permissions: DEFAULT_ROLES["Marketing"] },
    }),
    va: await prisma.role.upsert({
      where: { name_tenantId: { name: "VA / Admin", tenantId: demoTenant.id } },
      update: {},
      create: { name: "VA / Admin", tenantId: demoTenant.id, isSystem: true, permissions: DEFAULT_ROLES["VA / Admin"] },
    }),
  };

  // 3 Demo users
  const pw = await hash("demo123", 12);
  await prisma.user.upsert({
    where: { email_tenantId: { email: "demo@skicenter.com", tenantId: demoTenant.id } },
    update: {},
    create: { email: "demo@skicenter.com", name: "Demo Admin", passwordHash: pw, tenantId: demoTenant.id, roleId: roles.owner.id },
  });
  await prisma.user.upsert({
    where: { email_tenantId: { email: "natalia@demo.skicenter.com", tenantId: demoTenant.id } },
    update: {},
    create: { email: "natalia@demo.skicenter.com", name: "Natalia García", passwordHash: pw, tenantId: demoTenant.id, roleId: roles.sales.id },
  });
  await prisma.user.upsert({
    where: { email_tenantId: { email: "manager@demo.skicenter.com", tenantId: demoTenant.id } },
    update: {},
    create: { email: "manager@demo.skicenter.com", name: "Carlos Martínez", passwordHash: pw, tenantId: demoTenant.id, roleId: roles.va.id },
  });

  // Keep old demo users for backward compat
  await prisma.user.upsert({
    where: { email_tenantId: { email: "admin@demo.com", tenantId: demoTenant.id } },
    update: {},
    create: { email: "admin@demo.com", name: "Demo Admin (legacy)", passwordHash: await hash("demo1234", 12), tenantId: demoTenant.id, roleId: roles.owner.id },
  });
  await prisma.user.upsert({
    where: { email_tenantId: { email: "sales@demo.com", tenantId: demoTenant.id } },
    update: {},
    create: { email: "sales@demo.com", name: "Demo Sales (legacy)", passwordHash: await hash("demo1234", 12), tenantId: demoTenant.id, roleId: roles.sales.id },
  });

  for (const mod of ["comms", "pipelines", "analytics", "contacts"]) {
    await prisma.moduleConfig.upsert({
      where: { tenantId_module: { tenantId: demoTenant.id, module: mod } },
      update: {},
      create: { tenantId: demoTenant.id, module: mod, isEnabled: true },
    });
  }

  // Seed products + season calendar + curated demo data
  const productCount = await seedProducts();
  console.log(`Seeded ${productCount} global products`);

  const calendarCount = await seedSeasonCalendar(demoTenant.id);
  console.log(`Seeded ${calendarCount} season calendar entries for demo tenant`);

  await seedDemoData(demoTenant.id);

  console.log("Demo tenant seed complete");
}

main().catch(console.error).finally(() => prisma.$disconnect());
