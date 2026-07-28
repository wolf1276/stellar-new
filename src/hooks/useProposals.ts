"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createProposal,
  executeProposal,
  getAllProposals,
  getProposal,
  hasVoted,
  vote,
  Proposal,
  VoteChoice,
} from "@/lib/voting-contract";

type TxStatus = "idle" | "pending" | "success" | "error";

/** Fetches and refreshes the full proposal list for the connected address. */
export function useProposalList(address: string | null) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    setError(null);
    try {
      setProposals(await getAllProposals(address));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load proposals.");
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { proposals, loading, error, refresh };
}

/** Fetches a single proposal plus this wallet's vote status, and exposes vote/execute actions. */
export function useProposal(address: string | null, proposalId: number) {
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [voted, setVoted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<TxStatus>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    setError(null);
    try {
      const [p, v] = await Promise.all([
        getProposal(address, proposalId),
        hasVoted(address, proposalId),
      ]);
      setProposal(p);
      setVoted(v);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load proposal.");
    } finally {
      setLoading(false);
    }
  }, [address, proposalId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const castVote = useCallback(
    async (choice: VoteChoice) => {
      if (!address) return;
      setTxStatus("pending");
      setError(null);
      try {
        const hash = await vote(address, proposalId, choice);
        setTxHash(hash);
        setTxStatus("success");
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Vote failed.");
        setTxStatus("error");
      }
    },
    [address, proposalId, refresh]
  );

  const runExecute = useCallback(async () => {
    if (!address) return;
    setTxStatus("pending");
    setError(null);
    try {
      const hash = await executeProposal(address, proposalId);
      setTxHash(hash);
      setTxStatus("success");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Execution failed.");
      setTxStatus("error");
    }
  }, [address, proposalId, refresh]);

  return { proposal, voted, loading, error, txStatus, txHash, castVote, runExecute, refresh };
}

export function useCreateProposal(address: string | null) {
  const [status, setStatus] = useState<TxStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [proposalId, setProposalId] = useState<number | null>(null);

  const submit = useCallback(
    async (title: string, description: string, deadline: Date) => {
      if (!address) return null;
      setStatus("pending");
      setError(null);
      try {
        const id = await createProposal(address, title, description, deadline);
        setProposalId(id);
        setStatus("success");
        return id;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to create proposal.");
        setStatus("error");
        return null;
      }
    },
    [address]
  );

  return { status, error, proposalId, submit };
}
