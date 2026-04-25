import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "groups:members:import" });

interface CSVMember {
  name: string;
  email: string | null;
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
  shoeSize: string | null;
  skiLevel: string | null;
  notes: string | null;
}

const HEADER_MAP: Record<string, keyof CSVMember> = {
  name: "name",
  nombre: "name",
  email: "email",
  correo: "email",
  age: "age",
  edad: "age",
  height: "heightCm",
  altura: "heightCm",
  height_cm: "heightCm",
  weight: "weightKg",
  peso: "weightKg",
  weight_kg: "weightKg",
  shoe: "shoeSize",
  shoe_size: "shoeSize",
  pie: "shoeSize",
  talla: "shoeSize",
  level: "skiLevel",
  nivel: "skiLevel",
  ski_level: "skiLevel",
  notes: "notes",
  notas: "notes",
};

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result.map((s) => s.trim());
}

function parseCSV(csv: string): CSVMember[] {
  const lines = csv.replace(/\r\n/g, "\n").split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const headers = splitCSVLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  const fieldByCol = headers.map((h) => HEADER_MAP[h]);

  const out: CSVMember[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = splitCSVLine(lines[i]);
    const row: CSVMember = {
      name: "",
      email: null,
      age: null,
      heightCm: null,
      weightKg: null,
      shoeSize: null,
      skiLevel: null,
      notes: null,
    };
    for (let c = 0; c < headers.length; c++) {
      const field = fieldByCol[c];
      if (!field) continue;
      const raw = values[c] ?? "";
      if (raw === "") continue;
      if (field === "age" || field === "heightCm" || field === "weightKg") {
        const n = parseInt(raw, 10);
        if (Number.isFinite(n)) row[field] = n;
      } else {
        row[field] = raw;
      }
    }
    if (row.name) out.push(row);
  }
  return out;
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = session.user;
  const { id } = await ctx.params;

  try {
    const group = await prisma.groupBooking.findFirst({ where: { id, tenantId } });
    if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const contentType = request.headers.get("content-type") ?? "";
    let csv = "";
    if (contentType.includes("application/json")) {
      const body = await request.json();
      csv = typeof body?.csv === "string" ? body.csv : "";
    } else {
      csv = await request.text();
    }
    if (!csv.trim()) {
      return NextResponse.json({ error: "Empty CSV" }, { status: 400 });
    }

    const rows = parseCSV(csv);
    if (rows.length === 0) {
      return NextResponse.json({ error: "No valid rows" }, { status: 400 });
    }

    const created = await prisma.groupMember.createManyAndReturn({
      data: rows.map((r) => ({ groupId: id, ...r })),
    });

    return NextResponse.json({ imported: created.length, members: created }, { status: 201 });
  } catch (error) {
    log.error({ error, tenantId, id }, "Failed to import CSV");
    return NextResponse.json({ error: "Failed to import CSV" }, { status: 500 });
  }
}
