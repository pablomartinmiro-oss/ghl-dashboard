"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, ArrowLeft, X, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useUpdateReservation, useDeleteReservation, type Reservation } from "@/hooks/useReservations";
import { STATUS_CONFIG, SOURCE_CONFIG, formatDate } from "./constants";
import { DetailSections } from "./DetailSections";

interface ReservationDetailProps {
  reservation: Reservation;
  onBack: () => void;
}

export function ReservationDetail({ reservation, onBack }: ReservationDetailProps) {
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(reservation.notes ?? "");
  const [internalNotes, setInternalNotes] = useState(reservation.internalNotes ?? "");
  const [editingClient, setEditingClient] = useState(false);
  const [editingDetails, setEditingDetails] = useState(false);
  const [clientFields, setClientFields] = useState({
    clientName: reservation.clientName,
    clientPhone: reservation.clientPhone,
    clientEmail: reservation.clientEmail,
  });
  const [detailFields, setDetailFields] = useState({
    station: reservation.station,
    activityDate: reservation.activityDate.slice(0, 10),
    schedule: reservation.schedule,
  });
  const updateReservation = useUpdateReservation();
  const deleteReservation = useDeleteReservation();

  const statusCfg = STATUS_CONFIG[reservation.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pendiente;
  const sourceCfg = SOURCE_CONFIG[reservation.source as keyof typeof SOURCE_CONFIG];

  const handleStatusChange = useCallback(
    (newStatus: string) => {
      updateReservation.mutate(
        { id: reservation.id, status: newStatus },
        {
          onSuccess: () => toast.success(`Estado actualizado a "${STATUS_CONFIG[newStatus as keyof typeof STATUS_CONFIG]?.label ?? newStatus}"`),
          onError: () => toast.error("Error al actualizar el estado"),
        }
      );
    },
    [reservation.id, updateReservation]
  );

  const handleSaveNotes = useCallback(() => {
    updateReservation.mutate(
      { id: reservation.id, notes, internalNotes },
      {
        onSuccess: () => { toast.success("Notas guardadas"); setEditingNotes(false); },
        onError: () => toast.error("Error al guardar notas"),
      }
    );
  }, [reservation.id, notes, internalNotes, updateReservation]);

  const handleSaveClient = useCallback(() => {
    updateReservation.mutate(
      { id: reservation.id, ...clientFields },
      {
        onSuccess: () => { toast.success("Datos del cliente actualizados"); setEditingClient(false); },
        onError: () => toast.error("Error al guardar"),
      }
    );
  }, [reservation.id, clientFields, updateReservation]);

  const handleSaveDetails = useCallback(() => {
    updateReservation.mutate(
      { id: reservation.id, station: detailFields.station, activityDate: detailFields.activityDate, schedule: detailFields.schedule },
      {
        onSuccess: () => { toast.success("Detalles actualizados"); setEditingDetails(false); },
        onError: () => toast.error("Error al guardar"),
      }
    );
  }, [reservation.id, detailFields, updateReservation]);

  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado`);
  }, []);

  const handleDelete = useCallback(() => {
    if (!confirm("¿Eliminar esta reserva? Esta acción no se puede deshacer.")) return;
    deleteReservation.mutate(reservation.id, {
      onSuccess: () => { toast.success("Reserva eliminada"); onBack(); },
      onError: () => toast.error("Error al eliminar"),
    });
  }, [reservation.id, deleteReservation, onBack]);

  const finalPrice = reservation.discount > 0
    ? reservation.totalPrice * (1 - reservation.discount / 100)
    : reservation.totalPrice;

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-5 py-3">
        <button onClick={onBack} className="rounded-lg p-1.5 text-text-secondary hover:bg-warm-muted">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {sourceCfg && <span className="text-base">{sourceCfg.icon}</span>}
            <h2 className="text-base font-semibold text-text-primary">{reservation.clientName}</h2>
          </div>
          <p className="text-xs text-text-secondary">Creada {formatDate(reservation.createdAt)}</p>
        </div>
        <Badge className={cn("text-xs", statusCfg.color)}>{statusCfg.label}</Badge>
      </div>

      <div className="flex-1 space-y-5 p-5">
        {/* Status actions */}
        <div className="flex flex-wrap gap-2">
          {reservation.status !== "confirmada" && (
            <Button size="sm" className="gap-1.5 bg-sage text-white hover:bg-sage/90" onClick={() => handleStatusChange("confirmada")} disabled={updateReservation.isPending}>
              <CheckCircle className="h-3.5 w-3.5" /> Confirmar
            </Button>
          )}
          {reservation.status !== "sin_disponibilidad" && (
            <Button size="sm" variant="destructive" className="gap-1.5" onClick={() => handleStatusChange("sin_disponibilidad")} disabled={updateReservation.isPending}>
              <XCircle className="h-3.5 w-3.5" /> Sin disponibilidad
            </Button>
          )}
          {reservation.status !== "cancelada" && (
            <Button size="sm" variant="outline" className="gap-1.5 text-text-secondary" onClick={() => handleStatusChange("cancelada")} disabled={updateReservation.isPending}>
              <X className="h-3.5 w-3.5" /> Cancelar
            </Button>
          )}
          {reservation.status !== "pendiente" && (
            <Button size="sm" variant="outline" className="gap-1.5 text-gold" onClick={() => handleStatusChange("pendiente")} disabled={updateReservation.isPending}>
              <Clock className="h-3.5 w-3.5" /> Pendiente
            </Button>
          )}
          <Button size="sm" variant="outline" className="ml-auto gap-1.5 text-muted-red border-muted-red/30 hover:bg-muted-red-light" onClick={handleDelete} disabled={deleteReservation.isPending}>
            <Trash2 className="h-3.5 w-3.5" /> Eliminar
          </Button>
        </div>

        <DetailSections
          reservation={reservation}
          editingClient={editingClient}
          setEditingClient={setEditingClient}
          clientFields={clientFields}
          setClientFields={setClientFields}
          handleSaveClient={handleSaveClient}
          editingDetails={editingDetails}
          setEditingDetails={setEditingDetails}
          detailFields={detailFields}
          setDetailFields={setDetailFields}
          handleSaveDetails={handleSaveDetails}
          editingNotes={editingNotes}
          setEditingNotes={setEditingNotes}
          notes={notes}
          setNotes={setNotes}
          internalNotes={internalNotes}
          setInternalNotes={setInternalNotes}
          handleSaveNotes={handleSaveNotes}
          copyToClipboard={copyToClipboard}
          finalPrice={finalPrice}
          isPending={updateReservation.isPending}
        />
      </div>
    </div>
  );
}
