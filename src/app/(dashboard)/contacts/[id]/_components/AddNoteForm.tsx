"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

interface AddNoteFormProps {
  onSubmit: (body: string) => void;
  disabled?: boolean;
  sending?: boolean;
}

export function AddNoteForm({ onSubmit, disabled, sending }: AddNoteFormProps) {
  const [body, setBody] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setBody("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Añadir una nota..."
        disabled={disabled || sending}
        rows={2}
        className="flex-1 resize-none rounded-md border border-border bg-white px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
      />
      <Button
        type="submit"
        size="sm"
        disabled={!body.trim() || disabled || sending}
        className="self-end"
      >
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}
