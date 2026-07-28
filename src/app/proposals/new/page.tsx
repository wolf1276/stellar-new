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

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [durationHours, setDurationHours] = useState("24");

  if (!wallet) {
    return (
      <Card className="flex flex-col items-center gap-4 w-full max-w-sm">
        <Button onClick={connect} disabled={connecting} aria-busy={connecting}>
          {connecting ? "Connecting..." : "Connect Freighter Wallet"}
        </Button>
        {walletError && <Alert variant="destructive">{walletError}</Alert>}
      </Card>
    );
  }

  const hours = Number(durationHours);
  const validDuration = Number.isFinite(hours) && hours >= MIN_VOTING_HOURS;
  const canSubmit = title.trim() && description.trim() && validDuration && status !== "pending";

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
      <h2 className="text-xl font-semibold">New Proposal</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Title
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Description
          <textarea
            className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/30 disabled:opacity-40"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Voting duration (hours)
          <Input
            type="number"
            min={MIN_VOTING_HOURS}
            value={durationHours}
            onChange={(e) => setDurationHours(e.target.value)}
            required
          />
          {!validDuration && (
            <span className="text-xs text-red-500">Must be at least {MIN_VOTING_HOURS} hour.</span>
          )}
        </label>
        <Button type="submit" disabled={!canSubmit} aria-busy={status === "pending"}>
          {status === "pending" ? "Submitting..." : "Create Proposal"}
        </Button>
        {error && <Alert variant="destructive">{error}</Alert>}
      </form>
    </Card>
  );
}
