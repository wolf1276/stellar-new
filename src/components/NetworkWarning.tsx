"use client";

import { useWallet } from "@/hooks/useWallet";
import { NETWORK_PASSPHRASE } from "@/lib/stellar";
import { Alert } from "@/components/ui/alert";

export default function NetworkWarning() {
  const { wallet } = useWallet();
  if (!wallet || wallet.networkPassphrase === NETWORK_PASSPHRASE) return null;

  return (
    <Alert variant="destructive" className="w-full max-w-2xl">
      Freighter is set to {wallet.network}, but this app runs on Testnet. Switch networks in
      Freighter before continuing.
    </Alert>
  );
}
