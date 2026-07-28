"use client";

import { useCallback, useState } from "react";
import { sendPayment } from "@/lib/transaction";

type Status = "idle" | "pending" | "success" | "error";

export function useTransaction() {
  const [status, setStatus] = useState<Status>("idle");
  const [hash, setHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    async (sourceAddress: string, destination: string, amount: string) => {
      setStatus("pending");
      setError(null);
      setHash(null);
      try {
        const txHash = await sendPayment(sourceAddress, destination, amount);
        setHash(txHash);
        setStatus("success");
        return txHash;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Transaction failed.");
        setStatus("error");
        return null;
      }
    },
    []
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setHash(null);
    setError(null);
  }, []);

  return { status, hash, error, send, reset };
}
