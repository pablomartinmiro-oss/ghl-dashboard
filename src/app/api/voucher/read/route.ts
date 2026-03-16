import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { logger } from "@/lib/logger";

interface VoucherData {
  producto: string;
  codigoSeguridad: string;
  codigoCupon: string;
  precioOriginal: number;
  precioGroupon: number;
  descuento: number;
  cantidadPagada: number;
  caduca: string;
  cantidad: number;
  serviciosDetectados: {
    tipo: string;
    duracion: string;
    equipo: boolean;
    casco: boolean;
    tipoPersona: string;
  };
}

const EXTRACTION_PROMPT = `Extrae toda la información de esta imagen de cupón Groupon.
Devuelve SOLAMENTE JSON válido con estos campos:
- producto (string): descripción completa del producto
- codigoSeguridad (string): código de seguridad del cupón
- codigoCupon (string): código del cupón (formato VS-XXXX-XXXX-XXXX-XXXX o similar)
- precioOriginal (number): precio original antes de descuento
- precioGroupon (number): precio de venta en Groupon
- descuento (number): cantidad de descuento aplicada
- cantidadPagada (number): cantidad final pagada por el cliente
- caduca (string): fecha de caducidad en formato YYYY-MM-DD
- cantidad (number): número de unidades/personas
- serviciosDetectados (object): con campos tipo (cursillo/forfait/alquiler), duracion (1 día/2 días/etc), equipo (boolean), casco (boolean), tipoPersona (adulto/infantil)

Si no puedes leer algún campo, usa null. NO inventes datos.
Responde SOLO con el JSON, sin texto adicional ni markdown.`;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const log = logger.child({ tenantId: session.user.tenantId, path: "/api/voucher/read" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    log.error("ANTHROPIC_API_KEY not configured");
    return NextResponse.json(
      { error: "El lector de cupones no está configurado. Contacta al administrador." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { image, mediaType } = body as { image?: string; mediaType?: string };

    if (!image) {
      return NextResponse.json({ error: "No se proporcionó imagen" }, { status: 400 });
    }

    // Validate media type
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const mType = mediaType || "image/jpeg";
    if (!validTypes.includes(mType)) {
      return NextResponse.json({ error: "Tipo de imagen no soportado" }, { status: 400 });
    }

    log.info("Sending voucher image to Claude API");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mType,
                  data: image,
                },
              },
              {
                type: "text",
                text: EXTRACTION_PROMPT,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      log.error({ status: response.status, body: errText }, "Claude API error");
      return NextResponse.json(
        { error: "Error al procesar la imagen. Inténtalo de nuevo." },
        { status: 502 }
      );
    }

    const result = await response.json();
    const textContent = result.content?.find(
      (c: { type: string }) => c.type === "text"
    );

    if (!textContent?.text) {
      log.error("No text content in Claude response");
      return NextResponse.json(
        { error: "No se pudo leer el cupón" },
        { status: 422 }
      );
    }

    // Parse the JSON response from Claude
    let voucherData: VoucherData;
    try {
      // Strip any markdown code fences if present
      const cleanJson = textContent.text
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();
      voucherData = JSON.parse(cleanJson);
    } catch {
      log.error({ rawText: textContent.text }, "Failed to parse Claude JSON response");
      return NextResponse.json(
        { error: "No se pudo interpretar la respuesta del lector" },
        { status: 422 }
      );
    }

    log.info({ producto: voucherData.producto }, "Voucher read successfully");
    return NextResponse.json({ voucher: voucherData });
  } catch (error) {
    log.error({ error }, "Voucher read failed");
    return NextResponse.json(
      { error: "Error al leer el cupón" },
      { status: 500 }
    );
  }
}
