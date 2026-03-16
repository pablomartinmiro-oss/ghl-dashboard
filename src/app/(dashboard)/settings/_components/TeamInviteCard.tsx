"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Copy, Check } from "lucide-react";

interface TeamInviteCardProps {
  onInvite: (email: string) => void;
  isPending: boolean;
  inviteUrl: string | null;
}

export function TeamInviteCard({ onInvite, isPending, inviteUrl }: TeamInviteCardProps) {
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    onInvite(email.trim());
    setEmail("");
    setCopied(false);
  }

  function handleCopy() {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-lg border border-border bg-white p-4">
      <h3 className="text-sm font-semibold text-text-primary">Invitar miembro</h3>
      <form onSubmit={handleSubmit} className="mt-2 flex gap-2">
        <Input
          type="email"
          placeholder="email@equipo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="max-w-xs"
        />
        <Button type="submit" size="sm" disabled={isPending || !email.trim()}>
          {isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
          Invitar
        </Button>
      </form>

      {inviteUrl && (
        <div className="mt-3 flex items-center gap-2 rounded-md bg-gray-50 p-2">
          <code className="flex-1 truncate text-xs text-text-secondary">{inviteUrl}</code>
          <button
            onClick={handleCopy}
            className="shrink-0 rounded p-1 hover:bg-gray-200"
            title="Copiar enlace"
          >
            {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4 text-text-secondary" />}
          </button>
        </div>
      )}
    </div>
  );
}
