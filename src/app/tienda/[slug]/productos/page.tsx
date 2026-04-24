"use client";

import { useEffect, useMemo, useState, use } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface Destination {
  id: string;
  name: string;
  slug: string;
  region: string | null;
}

interface ProductCard {
  id: string;
  name: string;
  description: string | null;
  category: string;
  station: string;
  priceType: string;
  price: number | null;
  destination: { id: string; name: string; slug: string } | null;
  serviceCategory: { id: string; name: string; slug: string; icon: string | null } | null;
}

interface StorefrontConfigView {
  slug: string;
  showPrices: boolean;
  allowBookings: boolean;
}

interface BrandingView {
  primaryColor: string;
}

function formatEUR(value: number | null): string {
  if (value === null) return "Consultar";
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function priceTypeLabel(priceType: string): string {
  switch (priceType) {
    case "per_day":
      return "/ dia";
    case "per_person_per_hour":
      return "/ persona/hora";
    case "per_session":
      return "/ sesion";
    default:
      return "";
  }
}

export default function ProductsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const searchParams = useSearchParams();
  const initialDest = searchParams.get("destinationId") || "";
  const initialCategory = searchParams.get("category") || "";

  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [products, setProducts] = useState<ProductCard[]>([]);
  const [config, setConfig] = useState<StorefrontConfigView | null>(null);
  const [branding, setBranding] = useState<BrandingView | null>(null);
  const [loading, setLoading] = useState(true);
  const [destinationId, setDestinationId] = useState(initialDest);
  const [category, setCategory] = useState(initialCategory);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [cfgRes, destRes] = await Promise.all([
        fetch(`/api/storefront/${slug}`),
        fetch(`/api/storefront/${slug}/destinations`),
      ]);
      if (!cancelled && cfgRes.ok) {
        const json = await cfgRes.json();
        setConfig(json.config);
        setBranding(json.branding);
      }
      if (!cancelled && destRes.ok) {
        const json = await destRes.json();
        setDestinations(json.destinations);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    async function loadProducts() {
      const params = new URLSearchParams();
      if (destinationId) params.set("destinationId", destinationId);
      if (category) params.set("category", category);
      const res = await fetch(`/api/storefront/${slug}/products?${params.toString()}`);
      if (!cancelled && res.ok) {
        const json = await res.json();
        setProducts(json.products);
      }
      if (!cancelled) setLoading(false);
    }
    void loadProducts();
    return () => {
      cancelled = true;
    };
  }, [slug, destinationId, category]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) set.add(p.category);
    return Array.from(set).sort();
  }, [products]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q),
    );
  }, [products, search]);

  const primary = branding?.primaryColor || "#E87B5A";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Catalogo</h1>
      <p className="mt-1 text-sm text-[#8A8580]">
        Explora nuestros productos y servicios.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar producto..."
          className="min-w-[220px] flex-1 rounded-[10px] border border-[#E8E4DE] bg-white px-3 py-2 text-sm"
        />
        <select
          value={destinationId}
          onChange={(e) => setDestinationId(e.target.value)}
          className="rounded-[10px] border border-[#E8E4DE] bg-white px-3 py-2 text-sm"
        >
          <option value="">Todos los destinos</option>
          {destinations.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-[10px] border border-[#E8E4DE] bg-white px-3 py-2 text-sm"
        >
          <option value="">Todas las categorias</option>
          {categories.map((c) => (
            <option key={c} value={c} className="capitalize">
              {c.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="mt-10 text-center text-sm text-[#8A8580]">Cargando...</div>
      ) : visible.length === 0 ? (
        <div className="mt-10 rounded-[16px] border border-dashed border-[#E8E4DE] bg-white p-10 text-center">
          <p className="text-sm text-[#8A8580]">
            No se han encontrado productos con esos filtros.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {visible.map((p) => (
            <article
              key={p.id}
              className="flex flex-col rounded-[16px] border border-[#E8E4DE] bg-white p-5"
            >
              <span className="mb-2 self-start rounded-full border border-[#E8E4DE] px-2 py-0.5 text-xs capitalize text-[#6E6A65]">
                {p.category.replace(/_/g, " ")}
              </span>
              <h3 className="text-base font-semibold">{p.name}</h3>
              {p.destination && (
                <p className="mt-0.5 text-xs text-[#8A8580]">{p.destination.name}</p>
              )}
              {p.description && (
                <p className="mt-2 text-sm text-[#6E6A65] line-clamp-3">
                  {p.description}
                </p>
              )}
              <div className="mt-auto flex items-end justify-between pt-4">
                {config?.showPrices ? (
                  <div>
                    <span className="text-lg font-semibold" style={{ color: primary }}>
                      {formatEUR(p.price)}
                    </span>
                    <span className="ml-1 text-xs text-[#8A8580]">
                      {priceTypeLabel(p.priceType)}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-[#8A8580]">Consultar precio</span>
                )}
                {config?.allowBookings && (
                  <Link
                    href={`/tienda/${slug}/reservar?productId=${p.id}`}
                    className="text-sm font-medium hover:underline"
                    style={{ color: primary }}
                  >
                    Reservar
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
