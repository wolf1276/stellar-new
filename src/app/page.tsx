import Link from "next/link";
import WalletCard from "@/components/WalletCard";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center gap-10 bg-zinc-50 font-sans dark:bg-black min-h-screen px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
        Stellar Governance Voting dApp
      </h1>
      <WalletCard />
      <Link href="/proposals">
        <Button>View Proposals</Button>
      </Link>
    </div>
  );
}
