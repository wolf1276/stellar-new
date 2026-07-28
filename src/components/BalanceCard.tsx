"use client";

import { useBalance } from "@/hooks/useBalance";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

export default function BalanceCard({ address }: { address: string }) {
  const { balance, loading, error, refresh } = useBalance(address);

  return (
    <Card className="flex items-center justify-between gap-3">
      <div className="flex flex-col gap-1">
        <span className="text-xs text-zinc-500">XLM Balance</span>
        <span className="text-2xl font-semibold tabular-nums">
          {loading && balance === null ? "..." : `${balance ?? "0"} XLM`}
        </span>
      </div>
      <Button variant="outline" onClick={refresh} disabled={loading} aria-busy={loading}>
        {loading ? "Refreshing..." : "Refresh"}
      </Button>
      {error && <Alert variant="destructive" className="w-full">{error}</Alert>}
    </Card>
  );
}
