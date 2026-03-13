"use client";

import { useState, useCallback } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MessageInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  sending?: boolean;
}

const SMS_SEGMENT_LENGTH = 160;

export function MessageInput({
  onSend,
  disabled = false,
  sending = false,
}: MessageInputProps) {
  const [message, setMessage] = useState("");

  const segments = Math.ceil(message.length / SMS_SEGMENT_LENGTH) || 0;

  const handleSend = useCallback(() => {
    const trimmed = message.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setMessage("");
  }, [message, onSend]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="border-t border-border bg-white p-3">
      <div className="flex gap-2">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            disabled ? "You don't have permission to send messages" : "Type a message..."
          }
          disabled={disabled || sending}
          rows={2}
          className="flex-1 resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
        <Button
          onClick={handleSend}
          disabled={disabled || sending || !message.trim()}
          size="icon"
          className="h-auto self-end"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      {message.length > 0 && (
        <p className="mt-1 text-xs text-muted-foreground">
          {message.length} chars &middot; {segments} SMS segment
          {segments !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
