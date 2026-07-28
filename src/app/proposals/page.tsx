"use client";

import Link from "next/link";
import { useWallet } from "@/hooks/useWallet";
import { useProposalList } from "@/hooks/useProposals";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import StatusBadge from "@/components/StatusBadge";

export default function ProposalsPage() {
  const { wallet, connecting, error: walletError, connect } = useWallet();
  const { proposals, loading, error, refresh } = useProposalList(wallet?.address ?? null);

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

  return (
    <div className="flex flex-col gap-4 w-full max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl">Proposals</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refresh()} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
          <Link href="/proposals/new">
            <Button>+ New Proposal</Button>
          </Link>
        </div>
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}

      {!loading && proposals.length === 0 && (
        <Card className="text-sm text-muted">No proposals yet. Create the first one.</Card>
      )}

      <ul className="flex flex-col gap-3">
        {proposals.map((p) => {
          const total = p.yesVotes + p.noVotes;
          const yesPct = total ? Math.round((p.yesVotes / total) * 100) : 0;
          return (
            <li key={p.id}>
              <Link href={`/proposals/${p.id}`}>
                <Card className="flex flex-col gap-2 hover:border-[var(--color-accent)] transition-colors">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={p.status} />
                    <span className="font-medium flex-1 truncate">{p.title}</span>
                    <span className="text-xs text-muted whitespace-nowrap">
                      {new Date(p.deadline * 1000).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-muted line-clamp-2">{p.description}</p>
                  <div className="progress">
                    <span style={{ width: `${yesPct}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-muted">
                    <span>Yes {yesPct}% ({p.yesVotes})</span>
                    <span>No {p.noVotes}</span>
                  </div>
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
