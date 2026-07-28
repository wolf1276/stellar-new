"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { connectWallet, getAuthorizedState, WalletState } from "@/lib/wallet";

const STORAGE_KEY = "wallet:connected";
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
      localStorage.setItem(STORAGE_KEY, "1");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to connect wallet.");
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setWallet(null);
    setError(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Auto-reconnect on load if the site was previously authorized.
  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) !== "1") return;
    getAuthorizedState()
      .then((state) => {
        if (state) setWallet(state);
        else localStorage.removeItem(STORAGE_KEY);
      })
      .catch(() => localStorage.removeItem(STORAGE_KEY));
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
