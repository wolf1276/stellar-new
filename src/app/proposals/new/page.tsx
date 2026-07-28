"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/hooks/useWallet";
import { useCreateProposal } from "@/hooks/useProposals";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

const MIN_VOTING_HOURS = 1;

export default function NewProposalPage() {
  const router = useRouter();
  const { wallet, connecting, error: walletError, connect } = useWallet();
  const { status, error, submit } = useCreateProposal(wallet?.address ?? null);
  const pending = status === "preparing" || status === "awaiting-signature" || status === "submitting";
  const phaseLabel: Record<string, string> = {
    preparing: "Preparing...",
    "awaiting-signature": "Awaiting signature...",
    submitting: "Submitting...",
  };

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [durationHours, setDurationHours] = useState("24");

  if (!wallet) {
    return (
      <Card className="flex flex-col items-center gap-4 w-full max-w-sm">
        <Button onClick={connect} disabled={connecting} aria-busy={connecting}>
          {connecting ? "Connecting..." : "Connect Wallet"}
        </Button>
        {walletError && <Alert variant="destructive">{walletError}</Alert>}
      </Card>
    );
  }

  const hours = Number(durationHours);
  const validDuration = Number.isFinite(hours) && hours >= MIN_VOTING_HOURS;
  const canSubmit = title.trim() && description.trim() && validDuration && !pending;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const deadline = new Date(Date.now() + hours * 60 * 60 * 1000);
    const id = await submit(title.trim(), description.trim(), deadline);
    if (id !== null && id >= 0) {
      router.push(`/proposals/${id}`);
    }
  }

  return (
    <Card className="flex flex-col gap-4 w-full max-w-md">
      <h2 className="text-2xl">New Proposal</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="label">Title *</span>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required />
        </label>
        <label className="flex flex-col gap-1">
          <span className="label">Description *</span>
          <textarea
            className="input"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="label">Voting duration (hours) *</span>
          <Input
            type="number"
            min={MIN_VOTING_HOURS}
            value={durationHours}
            onChange={(e) => setDurationHours(e.target.value)}
            required
          />
          {!validDuration && (
            <span className="text-xs" style={{ color: "var(--color-danger)" }}>
              Must be at least {MIN_VOTING_HOURS} hour.
            </span>
          )}
        </label>
        <div
          className="text-xs px-3 py-2"
          style={{ border: "1px solid #e8d0a8", background: "#faf0d8", color: "#7a5010" }}
        >
          ⚠ Submitting creates an on-chain transaction. You will sign with your wallet.
        </div>
        <Button type="submit" disabled={!canSubmit} aria-busy={pending}>
          {phaseLabel[status] ?? "Submit Proposal →"}
        </Button>
        {status === "failed" && error && <Alert variant="destructive">{error}</Alert>}
      </form>
    </Card>
  );
}
