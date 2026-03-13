"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import type { GHLMessage } from "@/lib/ghl/types";

interface MessageThreadProps {
  messages: GHLMessage[];
  loading: boolean;
}

export function MessageThread({ messages, loading }: MessageThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (loading) {
    return (
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "flex",
              i % 2 === 0 ? "justify-start" : "justify-end"
            )}
          >
            <Skeleton className="h-12 w-48 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        No messages yet
      </div>
    );
  }

  // Sort by date ascending
  const sorted = [...messages].sort(
    (a, b) => new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime()
  );

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="space-y-3">
        {sorted.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex",
              msg.direction === "outbound" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[75%] rounded-lg px-3 py-2 text-sm",
                msg.direction === "outbound"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              )}
            >
              <p className="whitespace-pre-wrap">{msg.body}</p>
              <p
                className={cn(
                  "mt-1 text-[10px]",
                  msg.direction === "outbound"
                    ? "text-primary-foreground/70"
                    : "text-muted-foreground"
                )}
              >
                {new Date(msg.dateAdded).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div ref={bottomRef} />
    </div>
  );
}
