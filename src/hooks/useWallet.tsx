"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { connectWallet, disconnectWallet, getAuthorizedState, WalletState } from "@/lib/wallet";

const POLL_MS = 3000;

interface WalletContextValue {
  wallet: WalletState | null;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

function useWalletState(): WalletContextValue {
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

    // The wallet-picker modal's promise never resolves/rejects if the user
    // dismisses it without selecting a wallet, so watch for its DOM node
    // being removed and treat that as a cancel.
    const cancelled = new Promise<"cancelled">((resolve) => {
      const observer = new MutationObserver(() => {
        if (!document.querySelector(".stellar-wallets-kit")) {
          observer.disconnect();
          // The modal also disappears on a successful connection, so give
          // connectWallet()'s own resolution a beat to win the race first.
          setTimeout(() => resolve("cancelled"), 300);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    });

    try {
      const result = await Promise.race([connectWallet().then((state) => ({ state })), cancelled]);
      if (result === "cancelled") return;
      setWallet(result.state);
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

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const value = useWalletState();
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within a WalletProvider");
  return ctx;
}
