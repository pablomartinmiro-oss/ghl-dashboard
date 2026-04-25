import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

type Params = { token: string };

async function getBooking(token: string) {
  const booking = await prisma.bookingRequest.findUnique({
    where: { id: token },
  });
  return booking;
}

export default async function MiReservaPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { token } = await params;
  const booking = await getBooking(token);

  if (!booking) {
    notFound();
  }

  const startDate = new Date(booking.startDate).toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const endDate = new Date(booking.endDate).toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const products = Array.isArray(booking.products)
    ? (booking.products as Array<Record<string, unknown>>)
    : [];

  return (
    <div className="space-y-6">
      <header className="rounded-2xl bg-white border border-[#E8E4DE] p-6 shadow-sm">
        <div className="text-xs uppercase tracking-wide text-[#8A8580]">
          Mi Reserva
        </div>
        <h1 className="mt-1 text-2xl font-semibold text-[#2D2A26]">
          {booking.customerName || "Reserva"}
        </h1>
        <div className="mt-3 inline-flex rounded-full bg-[#FAF1ED] text-[#E87B5A] px-3 py-1 text-xs font-medium">
          {booking.status}
        </div>
      </header>

      <section className="rounded-2xl bg-white border border-[#E8E4DE] p-6 text-center">
        <div className="text-xs uppercase tracking-wide text-[#8A8580] mb-2">
          Código de reserva
        </div>
        <div className="font-mono text-lg break-all text-[#2D2A26]">
          {booking.id}
        </div>
        <div className="mt-3 text-xs text-[#8A8580]">
          Presenta este código al recoger tu equipamiento
        </div>
      </section>

      <section className="rounded-2xl bg-white border border-[#E8E4DE] p-6 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#8A8580]">
          Detalles
        </h2>
        <div>
          <div className="text-xs text-[#8A8580]">Destino</div>
          <div className="font-medium">{booking.destination ?? "—"}</div>
        </div>
        <div>
          <div className="text-xs text-[#8A8580]">Inicio</div>
          <div className="font-medium capitalize">{startDate}</div>
        </div>
        <div>
          <div className="text-xs text-[#8A8580]">Fin</div>
          <div className="font-medium capitalize">{endDate}</div>
        </div>
        <div>
          <div className="text-xs text-[#8A8580]">Personas</div>
          <div className="font-medium">{booking.partySize}</div>
        </div>
      </section>

      {products.length > 0 && (
        <section className="rounded-2xl bg-white border border-[#E8E4DE] p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#8A8580] mb-3">
            Productos
          </h2>
          <ul className="space-y-2">
            {products.map((p, i) => (
              <li
                key={i}
                className="flex justify-between items-center py-2 border-b border-[#E8E4DE] last:border-0"
              >
                <span className="text-sm">{String(p.name ?? p.sku ?? "—")}</span>
                <span className="text-sm text-[#8A8580]">
                  {String(p.quantity ?? 1)}×
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-2xl bg-white border border-[#E8E4DE] p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#8A8580] mb-3">
          Recogida de equipamiento
        </h2>
        <div className="text-sm text-[#2D2A26] space-y-2">
          <p>Recoge tu equipamiento la víspera o el primer día de tu estancia.</p>
          <p className="text-[#8A8580]">
            Horario tienda: 09:00 — 19:00. Presenta tu código de reserva.
          </p>
        </div>
      </section>

      <section className="rounded-2xl bg-white border border-[#E8E4DE] p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#8A8580] mb-3">
          Antes del viaje
        </h2>
        <ul className="space-y-2 text-sm">
          {[
            "Documento de identidad",
            "Ropa térmica y guantes",
            "Crema solar y gafas de sol",
            "Casco (recomendado)",
            "Forfait o reserva de clases",
          ].map((item) => (
            <li key={item} className="flex items-center gap-2">
              <span className="h-4 w-4 rounded-full border border-[#E87B5A]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
