"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReviewFormProps {
  token: string;
  customerName: string;
  primaryColor: string;
  businessName: string;
}

export function ReviewForm({
  token,
  customerName,
  primaryColor,
  businessName,
}: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [name, setName] = useState(customerName);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1) {
      setError("Selecciona una valoración");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/reviews/public/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          title: title.trim() || null,
          content: content.trim() || null,
          customerName: name.trim() || customerName,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error || "Error al enviar");
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="text-center">
        <div
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full text-3xl text-white"
          style={{ backgroundColor: primaryColor }}
        >
          ✓
        </div>
        <h1 className="text-2xl font-semibold text-[#2D2A26]">¡Gracias!</h1>
        <p className="mt-2 text-sm text-[#8A8580]">
          Hemos recibido tu reseña. La revisaremos y publicaremos pronto.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-[#2D2A26] sm:text-2xl">
          ¿Cómo fue tu experiencia con {businessName}?
        </h1>
        <p className="mt-1 text-sm text-[#8A8580]">
          Tu reseña ayuda a otros viajeros a elegir bien.
        </p>
      </div>

      {/* Star rating */}
      <div>
        <label className="mb-2 block text-sm font-medium text-[#2D2A26]">
          Tu valoración
        </label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => {
            const active = (hover || rating) >= n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                aria-label={`${n} estrella${n > 1 ? "s" : ""}`}
                className="rounded-md p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={cn(
                    "h-9 w-9 transition-colors",
                    active ? "fill-coral text-coral" : "text-zinc-200"
                  )}
                  style={active ? { color: primaryColor, fill: primaryColor } : undefined}
                />
              </button>
            );
          })}
          {rating > 0 && (
            <span className="ml-3 text-sm font-medium text-[#2D2A26]">
              {rating} de 5
            </span>
          )}
        </div>
      </div>

      <div>
        <label
          htmlFor="reviewer-name"
          className="mb-1.5 block text-sm font-medium text-[#2D2A26]"
        >
          Tu nombre
        </label>
        <input
          id="reviewer-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          className="w-full rounded-[10px] border border-[#E8E4DE] bg-white px-3 py-2 text-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
        />
      </div>

      <div>
        <label
          htmlFor="reviewer-title"
          className="mb-1.5 block text-sm font-medium text-[#2D2A26]"
        >
          Título <span className="text-[#8A8580]">(opcional)</span>
        </label>
        <input
          id="reviewer-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          placeholder="Resume tu experiencia en una frase"
          className="w-full rounded-[10px] border border-[#E8E4DE] bg-white px-3 py-2 text-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
        />
      </div>

      <div>
        <label
          htmlFor="reviewer-content"
          className="mb-1.5 block text-sm font-medium text-[#2D2A26]"
        >
          Tu comentario <span className="text-[#8A8580]">(opcional)</span>
        </label>
        <textarea
          id="reviewer-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={5000}
          rows={5}
          placeholder="Cuéntanos qué te pareció el servicio..."
          className="w-full resize-none rounded-[10px] border border-[#E8E4DE] bg-white px-3 py-2 text-sm focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
        />
      </div>

      {error && (
        <p className="rounded-[10px] bg-[#C75D4A]/10 px-3 py-2 text-sm text-[#C75D4A]">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-[10px] py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
        style={{ backgroundColor: primaryColor }}
      >
        {submitting ? "Enviando..." : "Enviar reseña"}
      </button>
    </form>
  );
}
