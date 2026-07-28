"use client";

import { useState } from "react";
import { useTransaction } from "@/hooks/useTransaction";
import { isValidStellarAddress, isValidAmount, stellarExpertTxUrl } from "@/lib/transaction";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

export default function SendXlmForm({ sourceAddress }: { sourceAddress: string }) {
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const { status, hash, error, send, reset } = useTransaction();

  const pending = status === "preparing" || status === "awaiting-signature" || status === "submitting";
  const phaseLabel: Record<string, string> = {
    preparing: "Preparing...",
    "awaiting-signature": "Awaiting signature...",
    submitting: "Submitting...",
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!isValidStellarAddress(destination)) {
      setFormError("Enter a valid Stellar public key (starts with G).");
      return;
    }
    if (!isValidAmount(amount)) {
      setFormError("Enter an amount greater than 0.");
      return;
    }

    const txHash = await send(sourceAddress, destination, amount);
    if (txHash) {
      setDestination("");
      setAmount("");
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <span className="label">Send XLM</span>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm">Recipient address</span>
          <Input
            value={destination}
            onChange={(e) => {
              setDestination(e.target.value);
              reset();
            }}
            placeholder="G..."
            disabled={pending}
            required
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm">Amount (XLM)</span>
          <Input
            type="number"
            min="0"
            step="0.0000001"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              reset();
            }}
            placeholder="0.00"
            disabled={pending}
            required
          />
        </label>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {phaseLabel[status] ?? "Send"}
        </Button>
      </form>

      {formError && <Alert variant="destructive">{formError}</Alert>}
      {status === "failed" && error && <Alert variant="destructive">{error}</Alert>}
      {status === "confirmed" && hash && (
        <Alert variant="success" className="flex flex-col gap-1">
          <span>Transaction sent.</span>
          <span className="font-mono text-xs break-all">{hash}</span>
          <a
            href={stellarExpertTxUrl(hash)}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            View on Stellar Expert
          </a>
        </Alert>
      )}
    </Card>
  );
}
