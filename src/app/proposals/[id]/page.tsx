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
  const {
    proposal,
    voted,
    member,
    requiresMembership,
    loading,
    error,
    txStatus,
    txHash,
    castVote,
    runExecute,
    join,
  } = useProposal(wallet?.address ?? null, proposalId);

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

  if (loading && !proposal) {
    return <p className="text-sm text-muted">Loading proposal...</p>;
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

  const needsToJoin = requiresMembership && !member;
  const canVote = proposal.status === "Active" && !voted && !needsToJoin;
  const canExecute = proposal.status === "Closed";
  const txPending = txStatus === "preparing" || txStatus === "awaiting-signature" || txStatus === "submitting";
  const txPhaseLabel: Record<string, string> = {
    preparing: "Preparing...",
    "awaiting-signature": "Awaiting signature...",
    submitting: "Submitting...",
  };
  const totalVotes = proposal.yesVotes + proposal.noVotes;
  const yesPct = totalVotes ? Math.round((proposal.yesVotes / totalVotes) * 100) : 0;
  const noPct = 100 - yesPct;

  return (
    <div className="flex flex-col gap-3 w-full max-w-3xl">
      <Link href="/proposals" className="text-sm text-muted hover:underline">
        &larr; All proposals
      </Link>

      <Card className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-6 p-0 overflow-hidden">
        {/* left: content */}
        <div className="flex flex-col gap-3 p-5 md:border-r border-[var(--color-divider)]">
          <div className="flex items-center gap-2">
            <StatusBadge status={proposal.status} />
            <span className="ml-auto text-xs text-muted">
              Deadline {new Date(proposal.deadline * 1000).toLocaleString()}
            </span>
          </div>
          <h2 className="text-2xl">{proposal.title}</h2>
          <div className="text-xs text-muted">
            Proposed by <span className="font-mono">{proposal.creator}</span> ·{" "}
            {new Date(proposal.createdAt * 1000).toLocaleDateString()}
          </div>
          <hr className="border-[var(--color-divider)]" />
          <p className="text-sm whitespace-pre-wrap">{proposal.description}</p>
        </div>

        {/* right: vote panel */}
        <div className="flex flex-col gap-3 p-5 bg-[var(--color-surface)]">
          <span className="kicker">Cast your vote</span>
          {voted && <Alert>You&apos;ve already voted on this proposal.</Alert>}
          {needsToJoin && (
            <>
              <Alert>
                You need to join as a member (a one-time on-chain
                registration checked cross-contract by the voting contract)
                before you can vote.
              </Alert>
              <Button
                onClick={join}
                disabled={txPending}
                aria-busy={txPending}
                className="w-full justify-center"
              >
                {txPending ? txPhaseLabel[txStatus] : "Join to Vote"}
              </Button>
            </>
          )}
          <Button
            onClick={() => castVote("Yes")}
            disabled={!canVote || txPending}
            aria-busy={txPending}
            className="w-full justify-center"
            style={{ background: "var(--color-success)", borderColor: "var(--color-success)" }}
          >
            {txPending ? txPhaseLabel[txStatus] : "✓ Vote Yes"}
          </Button>
          <Button
            variant="destructive"
            onClick={() => castVote("No")}
            disabled={!canVote || txPending}
            aria-busy={txPending}
            className="w-full justify-center"
          >
            {txPending ? txPhaseLabel[txStatus] : "✕ Vote No"}
          </Button>

          {canExecute && (
            <Button variant="outline" onClick={runExecute} disabled={txPending} className="w-full justify-center">
              {txPending ? txPhaseLabel[txStatus] : "Execute Proposal"}
            </Button>
          )}

          <hr className="border-[var(--color-divider)]" />
          <span className="kicker">Live results</span>
          <span className="text-xs text-muted">{totalVotes} votes cast</span>
          <div className="progress" style={{ height: 8 }}>
            <span style={{ width: `${yesPct}%` }} />
          </div>
          <div className="flex justify-between text-xs text-muted">
            <span>Yes {yesPct}%</span>
            <span>No {noPct}%</span>
          </div>

          {txStatus === "failed" && error && <Alert variant="destructive">{error}</Alert>}
          {txStatus === "confirmed" && txHash && (
            <Alert variant="success" className="flex flex-col gap-1">
              <span>Confirmed.</span>
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
        </div>
      </Card>
    </div>
  );
}
