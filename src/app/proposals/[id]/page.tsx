"use client";

import { use } from "react";
import Link from "next/link";
import { useWallet } from "@/hooks/useWallet";
import { useProposal } from "@/hooks/useProposals";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import StatusBadge from "@/components/StatusBadge";
import { stellarExpertTxUrl } from "@/lib/transaction";

export default function ProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const proposalId = Number(id);
  const { wallet, connecting, error: walletError, connect } = useWallet();
  const { proposal, voted, loading, error, txStatus, txHash, castVote, runExecute } = useProposal(
    wallet?.address ?? null,
    proposalId
  );

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

  if (loading && !proposal) {
    return <p className="text-sm text-zinc-500">Loading proposal...</p>;
  }

  if (!proposal) {
    return (
      <Card className="flex flex-col gap-3 w-full max-w-md">
        <Alert variant="destructive">{error ?? "Proposal not found."}</Alert>
        <Link href="/proposals">
          <Button variant="outline">Back to proposals</Button>
        </Link>
      </Card>
    );
  }

  const now = Date.now() / 1000;
  const expired = now >= proposal.deadline;
  const canVote = proposal.status === "Active" && !expired && !voted;
  const canExecute = expired && proposal.status !== "Executed";
  const totalVotes = proposal.yesVotes + proposal.noVotes;
  const yesPct = totalVotes ? Math.round((proposal.yesVotes / totalVotes) * 100) : 0;

  return (
    <Card className="flex flex-col gap-4 w-full max-w-lg">
      <Link href="/proposals" className="text-sm text-zinc-500 hover:underline">
        &larr; All proposals
      </Link>

      <div className="flex items-start justify-between gap-2">
        <h2 className="text-xl font-semibold">{proposal.title}</h2>
        <StatusBadge status={proposal.status} />
      </div>
      <p className="text-sm text-zinc-500 whitespace-pre-wrap">{proposal.description}</p>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-zinc-500">
        <dt>Creator</dt>
        <dd className="font-mono truncate">{proposal.creator}</dd>
        <dt>Created</dt>
        <dd>{new Date(proposal.createdAt * 1000).toLocaleString()}</dd>
        <dt>Deadline</dt>
        <dd>{new Date(proposal.deadline * 1000).toLocaleString()}</dd>
      </dl>

      <div className="flex flex-col gap-1">
        <div className="h-2 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
          <div className="h-full bg-green-500" style={{ width: `${yesPct}%` }} />
        </div>
        <div className="flex justify-between text-xs text-zinc-500">
          <span>{proposal.yesVotes} yes ({yesPct}%)</span>
          <span>{proposal.noVotes} no</span>
        </div>
      </div>

      {voted && <Alert>You&apos;ve already voted on this proposal.</Alert>}

      <div className="flex gap-3">
        <Button
          onClick={() => castVote("Yes")}
          disabled={!canVote || txStatus === "pending"}
          aria-busy={txStatus === "pending"}
        >
          {txStatus === "pending" ? "Voting..." : "Vote Yes"}
        </Button>
        <Button
          variant="outline"
          onClick={() => castVote("No")}
          disabled={!canVote || txStatus === "pending"}
          aria-busy={txStatus === "pending"}
        >
          {txStatus === "pending" ? "Voting..." : "Vote No"}
        </Button>
      </div>

      {canExecute && (
        <Button variant="outline" onClick={runExecute} disabled={txStatus === "pending"}>
          {txStatus === "pending" ? "Executing..." : "Execute Proposal"}
        </Button>
      )}

      {error && <Alert variant="destructive">{error}</Alert>}
      {txStatus === "success" && txHash && (
        <Alert variant="success">
          Confirmed.{" "}
          <a
            href={stellarExpertTxUrl(txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            View on Stellar Expert
          </a>
        </Alert>
      )}
    </Card>
  );
}
