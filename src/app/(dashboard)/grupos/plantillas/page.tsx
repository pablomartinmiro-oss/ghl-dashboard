"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useGroupTemplates, useCreateGroupTemplate } from "@/hooks/useGroups";

const TYPE_LABEL: Record<string, string> = {
  school: "Colegio",
  company: "Empresa",
  club: "Club",
  family: "Familia",
  other: "Otro",
};

export default function GroupTemplatesPage() {
  const { data: templates = [], isLoading } = useGroupTemplates();
  const create = useCreateGroupTemplate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "school",
    defaultSize: 25,
    defaultDays: 5,
    includesEquipment: true,
    includesLessons: true,
    discountPct: 10,
    pricePerPerson: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { pricePerPerson, type, ...rest } = form;
    await create.mutateAsync({ ...rest, type: type as "school" | "company" | "club" | "family" | "other", pricePerPersonCents: Math.round(pricePerPerson * 100) });
    setOpen(false);
    setForm({ name: "", type: "school", defaultSize: 25, defaultDays: 5, includesEquipment: true, includesLessons: true, discountPct: 10, pricePerPerson: 0 });
  };

  return (
    <div className="space-y-6">
      <Link href="/grupos" className="inline-flex items-center gap-1 text-sm text-[#8A8580] hover:text-[#2D2A26]">
        <ArrowLeft className="h-4 w-4" /> Volver a grupos
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#2D2A26]">Plantillas de grupos</h1>
          <p className="text-sm text-[#8A8580]">Configuraciones predefinidas para colegios, empresas y clubes</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button><Plus className="h-4 w-4 mr-2" />Nueva plantilla</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva plantilla</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label>Nombre</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label>Tipo</label>
                  <select className="w-full h-10 px-3 rounded-[10px] border border-[#E8E4DE] bg-white" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    <option value="school">Colegio</option>
                    <option value="company">Empresa</option>
                    <option value="club">Club</option>
                    <option value="family">Familia</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
                <div>
                  <label>Tamaño por defecto</label>
                  <Input type="number" value={form.defaultSize} onChange={(e) => setForm({ ...form, defaultSize: Number(e.target.value) })} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label>Días</label>
                  <Input type="number" value={form.defaultDays} onChange={(e) => setForm({ ...form, defaultDays: Number(e.target.value) })} required />
                </div>
                <div>
                  <label>Descuento %</label>
                  <Input type="number" value={form.discountPct} onChange={(e) => setForm({ ...form, discountPct: Number(e.target.value) })} />
                </div>
              </div>
              <div>
                <label>Precio por persona (€)</label>
                <Input type="number" step="0.01" value={form.pricePerPerson} onChange={(e) => setForm({ ...form, pricePerPerson: Number(e.target.value) })} />
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.includesEquipment} onChange={(e) => setForm({ ...form, includesEquipment: e.target.checked })} />
                  Incluye equipo
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.includesLessons} onChange={(e) => setForm({ ...form, includesLessons: e.target.checked })} />
                  Incluye clases
                </label>
              </div>
              <Button type="submit" className="w-full" disabled={create.isPending}>Crear plantilla</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Plantillas</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-[#E8E4DE] bg-[#FAF9F7]">
              <tr className="text-left text-xs uppercase text-[#8A8580]">
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Tamaño</th>
                <th className="px-4 py-3">Días</th>
                <th className="px-4 py-3">Equipo</th>
                <th className="px-4 py-3">Clases</th>
                <th className="px-4 py-3">Descuento</th>
                <th className="px-4 py-3">€/persona</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-[#8A8580]">Cargando…</td></tr>
              ) : templates.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-[#8A8580]"><FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />No hay plantillas todavía</td></tr>
              ) : (
                templates.map((t) => (
                  <tr key={t.id} className="border-b border-[#E8E4DE] hover:bg-[#FAF9F7]">
                    <td className="px-4 py-3 font-medium">{t.name}</td>
                    <td className="px-4 py-3"><Badge variant="outline">{TYPE_LABEL[t.type] ?? t.type}</Badge></td>
                    <td className="px-4 py-3">{t.defaultSize}</td>
                    <td className="px-4 py-3">{t.defaultDays}</td>
                    <td className="px-4 py-3">{t.includesEquipment ? "Sí" : "No"}</td>
                    <td className="px-4 py-3">{t.includesLessons ? "Sí" : "No"}</td>
                    <td className="px-4 py-3">{t.discountPct}%</td>
                    <td className="px-4 py-3">{((t.pricePerPersonCents ?? 0) / 100).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</td>
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
