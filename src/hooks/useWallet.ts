"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { connectWallet, disconnectWallet, getAuthorizedState, WalletState } from "@/lib/wallet";

const POLL_MS = 3000;

export function useWallet() {
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const walletRef = useRef<WalletState | null>(null);
  useEffect(() => {
    walletRef.current = wallet;
  }, [wallet]);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const state = await connectWallet();
      setWallet(state);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to connect wallet.");
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setWallet(null);
    setError(null);
    disconnectWallet().catch(() => {});
  }, []);

  // Auto-reconnect on load if a wallet is already selected in the kit.
  useEffect(() => {
    getAuthorizedState().then((state) => {
      if (state) setWallet(state);
    });
  }, []);

  // Detect account switches or network changes in the extension.
  useEffect(() => {
    if (!wallet) return;
    const id = setInterval(async () => {
      const state = await getAuthorizedState().catch(() => null);
      const current = walletRef.current;
      if (!current) return;
      if (!state) {
        disconnect();
      } else if (state.address !== current.address || state.network !== current.network) {
        setWallet(state);
      }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [wallet, disconnect]);

  return { wallet, connecting, error, connect, disconnect };
}
