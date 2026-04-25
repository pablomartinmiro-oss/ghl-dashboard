import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { recommendSizes } from "@/lib/inventory/sizing";

const schema = z.object({
  heightCm: z.number().int().nullable().optional(),
  weightKg: z.number().int().nullable().optional(),
  age: z.number().int().nullable().optional(),
  level: z.string().nullable().optional(),
  shoeSize: z.string().nullable().optional(),
  headCm: z.number().int().nullable().optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    }
    const recommendation = recommendSizes(parsed.data);
    return NextResponse.json({ recommendation });
  } catch {
    return NextResponse.json({ error: "Failed to compute recommendation" }, { status: 500 });
  }
}
