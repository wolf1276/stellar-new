"use client";

import { useCallback, useState } from "react";
import { sendPayment, TxPhase } from "@/lib/transaction";

export function useTransaction() {
  const [status, setStatus] = useState<TxPhase>("idle");
  const [hash, setHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    async (sourceAddress: string, destination: string, amount: string) => {
      setError(null);
      setHash(null);
      try {
        const txHash = await sendPayment(sourceAddress, destination, amount, setStatus);
        setHash(txHash);
        return txHash;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Transaction failed.");
        setStatus("failed");
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
