import { cn } from "@/lib/utils";
import { ProposalStatus } from "@/lib/voting-contract";

const styles: Record<ProposalStatus, string> = {
  Active: "tag-active",
  Closed: "tag-closed",
  Executed: "tag-executed",
};

export default function StatusBadge({ status }: { status: ProposalStatus }) {
  return <span className={cn("tag", styles[status], "shrink-0")}>{status}</span>;
}
