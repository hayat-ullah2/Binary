"use client";

import { useCallback, useEffect, useState } from "react";
import type { LicenseKey, LicensePlan } from "@/types/admin";

export interface CreateKeyInput {
  label?: string;
  email?: string;
  plan?: LicensePlan;
  maxActivations?: number;
  expiresInDays?: number | null;
}

export function useLicenseKeys() {
  const [keys, setKeys] = useState<LicenseKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/keys", { cache: "no-store" });
      const data = (await res.json()) as { keys?: LicenseKey[]; error?: string };
      if (data.keys) setKeys(data.keys);
      setError(data.error ?? null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      await refresh();
      if (alive) setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [refresh]);

  const createKey = useCallback(async (input: CreateKeyInput) => {
    const res = await fetch("/api/admin/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = (await res.json()) as { key?: LicenseKey; error?: string };
    if (data.key) setKeys((prev) => [data.key as LicenseKey, ...prev]);
    return data.key ?? null;
  }, []);

  const setStatus = useCallback(
    async (id: string, status: "ACTIVE" | "INACTIVE" | "REVOKED") => {
      // optimistic
      setKeys((prev) =>
        prev.map((k) => (k.id === id ? { ...k, status } : k))
      );
      const res = await fetch(`/api/admin/keys/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await res.json()) as { key?: LicenseKey };
      if (data.key) {
        setKeys((prev) => prev.map((k) => (k.id === id ? (data.key as LicenseKey) : k)));
      }
    },
    []
  );

  const removeKey = useCallback(async (id: string) => {
    setKeys((prev) => prev.filter((k) => k.id !== id)); // optimistic
    await fetch(`/api/admin/keys/${id}`, { method: "DELETE" });
  }, []);

  return { keys, loading, error, refresh, createKey, setStatus, removeKey };
}
