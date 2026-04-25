"use client";

import { useState } from "react";
import { useUpdateReview, type Review } from "@/hooks/useReviews";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StarRating } from "./StarRating";

interface ResponseModalProps {
  review: Review | null;
  onClose: () => void;
}

export function ResponseModal({ review, onClose }: ResponseModalProps) {
  const [text, setText] = useState("");
  const update = useUpdateReview();

  return (
    <Dialog open={!!review} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Responder reseña</DialogTitle>
        </DialogHeader>
        {review && (
          <div className="space-y-3">
            <div className="rounded-[10px] bg-warm-muted/50 p-3 text-sm">
              <div className="mb-1 flex items-center gap-2">
                <StarRating value={review.rating} size="sm" />
                <span className="font-medium text-text-primary">
                  {review.customerName}
                </span>
              </div>
              <p className="text-text-secondary">{review.content ?? "—"}</p>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Escribe tu respuesta…"
              rows={4}
              className="w-full rounded-[10px] border border-warm-border bg-white px-3 py-2 text-sm"
            />
          </div>
        )}
        <DialogFooter>
          <button
            onClick={onClose}
            className="rounded-[10px] border border-warm-border bg-white px-3 py-2 text-sm font-medium text-text-primary hover:bg-warm-muted"
          >
            Cancelar
          </button>
          <button
            disabled={!text.trim() || update.isPending}
            onClick={() => {
              if (!review) return;
              update.mutate(
                { id: review.id, response: text.trim() },
                {
                  onSuccess: () => {
                    setText("");
                    onClose();
                  },
                }
              );
            }}
            className="rounded-[10px] bg-coral px-3 py-2 text-sm font-medium text-white hover:bg-coral-hover disabled:opacity-50"
          >
            Enviar respuesta
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
