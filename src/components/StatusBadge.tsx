import { cn } from "@/lib/utils";
import { ProposalStatus } from "@/lib/voting-contract";

const styles: Record<ProposalStatus, string> = {
  Active: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30",
  Closed: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/30",
  Executed: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
};

export default function StatusBadge({ status }: { status: ProposalStatus }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-xs font-medium shrink-0",
        styles[status]
      )}
    >
      {status}
    </span>
  );
}
