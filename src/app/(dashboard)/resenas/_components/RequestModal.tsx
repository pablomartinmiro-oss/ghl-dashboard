"use client";

import { useState } from "react";
import { useCreateReviewRequest } from "@/hooks/useReviews";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface RequestModalProps {
  open: boolean;
  onClose: () => void;
}

export function RequestModal({ open, onClose }: RequestModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const create = useCreateReviewRequest();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Solicitar reseña</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre del cliente"
            className="w-full rounded-[10px] border border-warm-border bg-white px-3 py-2 text-sm"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-[10px] border border-warm-border bg-white px-3 py-2 text-sm"
          />
        </div>
        <DialogFooter>
          <button
            onClick={onClose}
            className="rounded-[10px] border border-warm-border bg-white px-3 py-2 text-sm font-medium text-text-primary hover:bg-warm-muted"
          >
            Cancelar
          </button>
          <button
            disabled={!name.trim() || !email.trim() || create.isPending}
            onClick={() =>
              create.mutate(
                { customerName: name.trim(), customerEmail: email.trim() },
                {
                  onSuccess: () => {
                    setName("");
                    setEmail("");
                    onClose();
                  },
                }
              )
            }
            className="rounded-[10px] bg-coral px-3 py-2 text-sm font-medium text-white hover:bg-coral-hover disabled:opacity-50"
          >
            Enviar
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
