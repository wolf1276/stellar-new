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
import { isMember, joinMembership, MEMBERSHIP_CONTRACT_ID } from "@/lib/membership-contract";
import type { TxPhase } from "@/lib/transaction";

const LIVE_REFRESH_MS = 6000;

/** Fetches and refreshes the full proposal list for the connected address, polling for on-chain updates. */
export function useProposalList(address: string | null) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(
    async (silent = false) => {
      if (!address) return;
      if (!silent) setLoading(true);
      setError(null);
      try {
        setProposals(await getAllProposals(address));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load proposals.");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [address]
  );

  useEffect(() => {
    void Promise.resolve().then(() => refresh());
  }, [refresh]);

  // Live updates: poll the contract so new/changed proposals show up without a manual refresh.
  useEffect(() => {
    if (!address) return;
    const id = setInterval(() => refresh(true), LIVE_REFRESH_MS);
    return () => clearInterval(id);
  }, [address, refresh]);

  return { proposals, loading, error, refresh };
}

/** Fetches a single proposal plus this wallet's vote status, and exposes vote/execute actions. */
export function useProposal(address: string | null, proposalId: number) {
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [voted, setVoted] = useState(false);
  const [member, setMember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<TxPhase>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);

  const refresh = useCallback(
    async (silent = false) => {
      if (!address) return;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const [p, v, m] = await Promise.all([
          getProposal(address, proposalId),
          hasVoted(address, proposalId),
          isMember(address),
        ]);
        setProposal(p);
        setVoted(v);
        setMember(m);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load proposal.");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [address, proposalId]
  );

  useEffect(() => {
    void Promise.resolve().then(() => refresh());
  }, [refresh]);

  // Live updates: poll for vote-count/status changes made by other wallets.
  useEffect(() => {
    if (!address) return;
    const id = setInterval(() => refresh(true), LIVE_REFRESH_MS);
    return () => clearInterval(id);
  }, [address, refresh]);

  const castVote = useCallback(
    async (choice: VoteChoice) => {
      if (!address) return;
      setError(null);
      try {
        const hash = await vote(address, proposalId, choice, setTxStatus);
        setTxHash(hash);
        await refresh(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Vote failed.");
        setTxStatus("failed");
      }
    },
    [address, proposalId, refresh]
  );

  const runExecute = useCallback(async () => {
    if (!address) return;
    setError(null);
    try {
      const hash = await executeProposal(address, proposalId, setTxStatus);
      setTxHash(hash);
      await refresh(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Execution failed.");
      setTxStatus("failed");
    }
  }, [address, proposalId, refresh]);

  const join = useCallback(async () => {
    if (!address) return;
    setError(null);
    try {
      const hash = await joinMembership(address, setTxStatus);
      setTxHash(hash);
      await refresh(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to join.");
      setTxStatus("failed");
    }
  }, [address, refresh]);

  return {
    proposal,
    voted,
    member,
    requiresMembership: MEMBERSHIP_CONTRACT_ID !== null,
    loading,
    error,
    txStatus,
    txHash,
    castVote,
    runExecute,
    join,
    refresh,
  };
}

export function useCreateProposal(address: string | null) {
  const [status, setStatus] = useState<TxPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [proposalId, setProposalId] = useState<number | null>(null);

  const submit = useCallback(
    async (title: string, description: string, deadline: Date) => {
      if (!address) return null;
      setError(null);
      try {
        const id = await createProposal(address, title, description, deadline, setStatus);
        setProposalId(id);
        return id;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to create proposal.");
        setStatus("failed");
        return null;
      }
    },
    [address]
  );

  return { status, error, proposalId, submit };
}
