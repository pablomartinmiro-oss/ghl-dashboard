"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export function tokenKey(supplierId: string) {
  return `supplier-portal-token:${supplierId}`;
}

export function usePortalAuth(supplierId: string) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(tokenKey(supplierId));
    if (!stored) {
      router.replace(`/portal/${supplierId}`);
      return;
    }
    setToken(stored);
    setReady(true);
  }, [supplierId, router]);

  const authedFetch = useCallback(
    async (url: string, init?: RequestInit) => {
      const current = token ?? localStorage.getItem(tokenKey(supplierId));
      if (!current) throw new Error("No auth token");
      const res = await fetch(url, {
        ...init,
        headers: {
          ...(init?.headers ?? {}),
          Authorization: `Bearer ${current}`,
        },
      });
      if (res.status === 401) {
        localStorage.removeItem(tokenKey(supplierId));
        router.replace(`/portal/${supplierId}`);
        throw new Error("Unauthorized");
      }
      return res;
    },
    [token, supplierId, router]
  );

  return { token, ready, authedFetch };
}
