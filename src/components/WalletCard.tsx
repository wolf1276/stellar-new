"use client";

import { useWallet } from "@/hooks/useWallet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import BalanceCard from "@/components/BalanceCard";
import SendXlmForm from "@/components/SendXlmForm";

function truncate(address: string) {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export default function WalletCard() {
  const { wallet, connecting, error, connect, disconnect } = useWallet();

  if (!wallet) {
    return (
      <Card className="flex flex-col items-center gap-4 w-full max-w-sm">
        <Button onClick={connect} disabled={connecting} aria-busy={connecting}>
          {connecting ? "Connecting..." : "Connect Freighter Wallet"}
        </Button>
        {error && <Alert variant="destructive">{error}</Alert>}
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-sm">
      <Card className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="font-mono text-sm break-all">{truncate(wallet.address)}</span>
          <span className="text-xs text-zinc-500">{wallet.network}</span>
        </div>
        <Button variant="outline" onClick={disconnect}>
          Disconnect
        </Button>
      </Card>

      <BalanceCard address={wallet.address} />
      <SendXlmForm sourceAddress={wallet.address} />
    </div>
  );
}
