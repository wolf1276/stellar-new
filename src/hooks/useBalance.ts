"use client";

import { useCallback, useEffect, useState } from "react";
import { getXlmBalance } from "@/lib/stellar";

export function useBalance(address: string | null) {
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!address) {
      setBalance(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setBalance(await getXlmBalance(address));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load balance.");
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

  return { balance, loading, error, refresh };
}
