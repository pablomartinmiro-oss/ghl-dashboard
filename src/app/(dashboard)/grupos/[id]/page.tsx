"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState, useRef } from "react";
import { ArrowLeft, Upload, Wand2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGroup, useImportGroupMembers, useAutoSizeGroup } from "@/hooks/useGroups";

const SKILL_LABEL: Record<string, string> = {
  none: "Sin nivel",
  beginner: "Iniciación",
  intermediate: "Intermedio",
  advanced: "Avanzado",
  expert: "Experto",
};

const TYPE_LABEL: Record<string, string> = {
  school: "Colegio",
  company: "Empresa",
  club: "Club",
  family: "Familia",
  other: "Otro",
};

export default function GroupDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const { data: group, isLoading, refetch } = useGroup(id);
  const importMembers = useImportGroupMembers();
  const autoSize = useAutoSizeGroup();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    const text = await file.text();
    await importMembers.mutateAsync({ groupId: id, csv: text });
    await refetch();
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleAutoSize = async () => {
    setBusy(true);
    await autoSize.mutateAsync(id);
    await refetch();
    setBusy(false);
  };

  if (isLoading || !group) {
    return <div className="p-8 text-[#8A8580]">Cargando grupo…</div>;
  }

  const members = group.members ?? [];
  const totalEur = (group.totalCents ?? 0) / 100;
  const pricePerPerson = members.length > 0 ? totalEur / members.length : 0;

  return (
    <div className="space-y-6">
      <Link href="/grupos" className="inline-flex items-center gap-1 text-sm text-[#8A8580] hover:text-[#2D2A26]">
        <ArrowLeft className="h-4 w-4" /> Volver a grupos
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#2D2A26]">{group.name}</h1>
          <p className="text-sm text-[#8A8580] mt-1">
            {group.organizerName} · {group.organizerEmail || "—"} · {TYPE_LABEL[group.type] ?? group.type}
          </p>
          <div className="flex gap-2 mt-2">
            <Badge variant="outline">{group.estimatedSize} miembros previstos</Badge>
            <Badge variant="outline">
              {group.startDate ? new Date(group.startDate).toLocaleDateString("es-ES") : "—"} → {group.endDate ? new Date(group.endDate).toLocaleDateString("es-ES") : "—"}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".csv" hidden onChange={handleFile} />
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
            <Upload className="h-4 w-4 mr-2" /> Importar CSV
          </Button>
          <Button onClick={handleAutoSize} disabled={busy || members.length === 0}>
            <Wand2 className="h-4 w-4 mr-2" /> Auto-tallaje
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><Users className="h-5 w-5 text-[#E87B5A]" /><div><p className="text-xs text-[#8A8580]">Miembros</p><p className="text-2xl font-semibold">{members.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div><p className="text-xs text-[#8A8580]">Total estimado</p><p className="text-2xl font-semibold">{totalEur.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</p></div></CardContent></Card>
        <Card><CardContent className="p-4"><div><p className="text-xs text-[#8A8580]">Por persona</p><p className="text-2xl font-semibold">{pricePerPerson.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</p></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Miembros del grupo</CardTitle>
            <p className="text-xs text-[#8A8580]">
              CSV: nombre, edad, altura_cm, peso_kg, talla_pie, nivel
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-[#E8E4DE] bg-[#FAF9F7]">
              <tr className="text-left text-xs uppercase text-[#8A8580]">
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Edad</th>
                <th className="px-4 py-3">Altura</th>
                <th className="px-4 py-3">Peso</th>
                <th className="px-4 py-3">Pie</th>
                <th className="px-4 py-3">Nivel</th>
                <th className="px-4 py-3">Notas</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-[#8A8580]">
                  No hay miembros. Importa un CSV para empezar.
                </td></tr>
              ) : (
                members.map((m) => (
                  <tr key={m.id} className="border-b border-[#E8E4DE]">
                    <td className="px-4 py-3 font-medium">{m.name}</td>
                    <td className="px-4 py-3">{m.age ?? "—"}</td>
                    <td className="px-4 py-3">{m.heightCm ? `${m.heightCm} cm` : "—"}</td>
                    <td className="px-4 py-3">{m.weightKg ? `${m.weightKg} kg` : "—"}</td>
                    <td className="px-4 py-3">{m.shoeSize ?? "—"}</td>
                    <td className="px-4 py-3">{SKILL_LABEL[m.skiLevel ?? "none"] ?? m.skiLevel}</td>
                    <td className="px-4 py-3 text-[#8A8580]">{m.notes ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
