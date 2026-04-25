"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Users, School, Building2, Heart, Sparkles } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { useGroups } from "@/hooks/useGroups";

const TYPE_STYLES: Record<string, string> = {
  school: "bg-blue-100 text-blue-700",
  company: "bg-purple-100 text-purple-700",
  club: "bg-emerald-100 text-emerald-700",
  family: "bg-amber-100 text-amber-700",
  other: "bg-zinc-100 text-zinc-700",
};

const TYPE_LABEL: Record<string, string> = {
  school: "Colegio",
  company: "Empresa",
  club: "Club",
  family: "Familia",
  other: "Otro",
};

const STATUS_STYLES: Record<string, string> = {
  inquiry: "bg-amber-100 text-amber-700",
  quoted: "bg-blue-100 text-blue-700",
  confirmed: "bg-emerald-100 text-emerald-700",
  completed: "bg-zinc-100 text-zinc-700",
  cancelled: "bg-red-100 text-red-700",
};

const STATUS_LABEL: Record<string, string> = {
  inquiry: "Consulta",
  quoted: "Presupuestado",
  confirmed: "Confirmado",
  completed: "Completado",
  cancelled: "Cancelado",
};

export default function GruposPage() {
  const { data: groups = [], isLoading, create } = useGroups();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    organizerName: "",
    organizerEmail: "",
    type: "school",
    size: 20,
    startDate: "",
    endDate: "",
  });

  const stats = {
    total: groups.length,
    schools: groups.filter((g) => g.type === "school").length,
    confirmed: groups.filter((g) => g.status === "confirmed").length,
    members: groups.reduce((sum, g) => sum + (g.size || 0), 0),
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await create.mutateAsync(form);
    setOpen(false);
    setForm({ name: "", organizerName: "", organizerEmail: "", type: "school", size: 20, startDate: "", endDate: "" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#2D2A26]">Grupos y Colegios</h1>
          <p className="text-sm text-[#8A8580]">Gestiona reservas grupales, colegios y empresas</p>
        </div>
        <div className="flex gap-2">
          <Link href="/grupos/plantillas">
            <Button variant="outline">Plantillas</Button>
          </Link>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button><Plus className="h-4 w-4 mr-2" />Nuevo grupo</Button>} />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear grupo</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <Label>Nombre</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Organizador</Label>
                    <Input value={form.organizerName} onChange={(e) => setForm({ ...form, organizerName: e.target.value })} required />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={form.organizerEmail} onChange={(e) => setForm({ ...form, organizerEmail: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Tipo</Label>
                    <select className="w-full h-10 px-3 rounded-[10px] border border-[#E8E4DE] bg-white" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                      <option value="school">Colegio</option>
                      <option value="company">Empresa</option>
                      <option value="club">Club</option>
                      <option value="family">Familia</option>
                      <option value="other">Otro</option>
                    </select>
                  </div>
                  <div>
                    <Label>Tamaño</Label>
                    <Input type="number" value={form.size} onChange={(e) => setForm({ ...form, size: Number(e.target.value) })} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Inicio</Label>
                    <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                  </div>
                  <div>
                    <Label>Fin</Label>
                    <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={create.isPending}>Crear grupo</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><Users className="h-5 w-5 text-[#E87B5A]" /><div><p className="text-xs text-[#8A8580]">Total grupos</p><p className="text-2xl font-semibold">{stats.total}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><School className="h-5 w-5 text-blue-600" /><div><p className="text-xs text-[#8A8580]">Colegios</p><p className="text-2xl font-semibold">{stats.schools}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><Sparkles className="h-5 w-5 text-emerald-600" /><div><p className="text-xs text-[#8A8580]">Confirmados</p><p className="text-2xl font-semibold">{stats.confirmed}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><Heart className="h-5 w-5 text-purple-600" /><div><p className="text-xs text-[#8A8580]">Miembros</p><p className="text-2xl font-semibold">{stats.members}</p></div></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Grupos</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-[#E8E4DE] bg-[#FAF9F7]">
              <tr className="text-left text-xs uppercase text-[#8A8580]">
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Organizador</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Tamaño</th>
                <th className="px-4 py-3">Fechas</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[#8A8580]">Cargando…</td></tr>
              ) : groups.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[#8A8580]">No hay grupos todavía</td></tr>
              ) : (
                groups.map((g) => (
                  <tr key={g.id} className="border-b border-[#E8E4DE] hover:bg-[#FAF9F7]">
                    <td className="px-4 py-3 font-medium">{g.name}</td>
                    <td className="px-4 py-3 text-[#8A8580]">{g.organizerName}</td>
                    <td className="px-4 py-3"><Badge className={TYPE_STYLES[g.type] ?? TYPE_STYLES.other}>{TYPE_LABEL[g.type] ?? g.type}</Badge></td>
                    <td className="px-4 py-3">{g.size}</td>
                    <td className="px-4 py-3 text-[#8A8580] text-xs">{g.startDate ? new Date(g.startDate).toLocaleDateString("es-ES") : "—"} → {g.endDate ? new Date(g.endDate).toLocaleDateString("es-ES") : "—"}</td>
                    <td className="px-4 py-3"><Badge className={STATUS_STYLES[g.status] ?? STATUS_STYLES.inquiry}>{STATUS_LABEL[g.status] ?? g.status}</Badge></td>
                    <td className="px-4 py-3 text-right"><Link href={`/grupos/${g.id}`} className="text-[#E87B5A] hover:underline">Ver →</Link></td>
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
