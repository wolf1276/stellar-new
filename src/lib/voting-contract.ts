import {
  Contract,
  rpc,
  TransactionBuilder,
  BASE_FEE,
  nativeToScVal,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";
import { signWithWallet } from "./wallet";
import { NETWORK_PASSPHRASE } from "./stellar";
import type { TxPhase } from "./transaction";

export const VOTING_CONTRACT_ID =
  process.env.NEXT_PUBLIC_VOTING_CONTRACT_ID ??
  "CADQY6OJA3PZOPWIHHTJ7T67LFJJPLDDFE2UYDPJWPQVXONXM7JRSDIU";
const RPC_URL =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ?? "https://soroban-testnet.stellar.org";

const server = new rpc.Server(RPC_URL);
const contract = new Contract(VOTING_CONTRACT_ID);

export type ProposalStatus = "Active" | "Closed" | "Executed";
export type VoteChoice = "Yes" | "No";

export type Proposal = {
  id: number;
  title: string;
  description: string;
  creator: string;
  createdAt: number;
  deadline: number;
  status: ProposalStatus;
  yesVotes: number;
  noVotes: number;
};

/** Contract-side error codes, mirrored from `contracts/contracts/voting/src/lib.rs::Error`. */
const CONTRACT_ERRORS: Record<number, string> = {
  1: "Proposal not found.",
  2: "This wallet has already voted on this proposal.",
  3: "Voting is closed for this proposal.",
  4: "Deadline must be far enough in the future.",
  5: "Not authorized to perform this action.",
  6: "Invalid proposal (title/description required).",
  7: "Proposal has already been executed.",
  8: "Voting is still active; cannot execute yet.",
};

export function decodeContractError(raw: unknown): Error {
  const message = String(raw);
  const match = message.match(/Error\(Contract, #(\d+)\)/);
  if (match) {
    const code = Number(match[1]);
    return new Error(CONTRACT_ERRORS[code] ?? `Contract error #${code}`);
  }
  return raw instanceof Error ? raw : new Error(message);
}

function decodeProposal(native: Record<string, unknown>): Proposal {
  const statusTag = native.status as { tag?: string } | string;
  const status =
    typeof statusTag === "string" ? statusTag : (statusTag?.tag as ProposalStatus) ?? "Active";
  return {
    id: Number(native.id),
    title: String(native.title),
    description: String(native.description),
    creator: String(native.creator),
    createdAt: Number(native.created_at),
    deadline: Number(native.deadline),
    status: status as ProposalStatus,
    yesVotes: Number(native.yes_votes),
    noVotes: Number(native.no_votes),
  };
}

/**
 * Read-only call: simulate and decode the result, no signature or fee needed.
 * Simulation still needs a real account for the tx envelope, so it's run as
 * the connected wallet's own address (must already be funded on testnet).
 */
async function simulateCall(
  sourceAddress: string,
  method: string,
  args: xdr.ScVal[] = []
) {
  const source = await server.getAccount(sourceAddress);
  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) throw decodeContractError(sim.error);
  return scValToNative(sim.result!.retval);
}

/** Builds, simulates, signs (via the connected wallet), and submits a contract-invoking transaction. */
async function invoke(
  address: string,
  method: string,
  args: xdr.ScVal[],
  onPhase?: (phase: TxPhase) => void
) {
  onPhase?.("preparing");
  const source = await server.getAccount(address);
  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  let prepared;
  try {
    prepared = await server.prepareTransaction(tx);
  } catch (e) {
    onPhase?.("failed");
    throw decodeContractError(e);
  }

  onPhase?.("awaiting-signature");
  const signedTxXdr = await signWithWallet(prepared.toXDR(), address, NETWORK_PASSPHRASE);

  onPhase?.("submitting");
  const signedTx = TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE);
  const sendResult = await server.sendTransaction(signedTx);

  if (sendResult.status === "ERROR") {
    onPhase?.("failed");
    throw decodeContractError(sendResult.errorResult);
  }

  let getResult = await server.getTransaction(sendResult.hash);
  while (getResult.status === "NOT_FOUND") {
    await new Promise((r) => setTimeout(r, 1000));
    getResult = await server.getTransaction(sendResult.hash);
  }

  if (getResult.status !== "SUCCESS") {
    onPhase?.("failed");
    throw new Error(`Transaction failed with status: ${getResult.status}`);
  }

  onPhase?.("confirmed");
  return sendResult.hash;
}

export async function getAllProposals(sourceAddress: string): Promise<Proposal[]> {
  const raw: Record<string, unknown>[] = await simulateCall(sourceAddress, "get_all_proposals");
  return raw.map(decodeProposal);
}

export async function getProposal(
  sourceAddress: string,
  proposalId: number
): Promise<Proposal> {
  const raw = await simulateCall(sourceAddress, "get_proposal", [
    nativeToScVal(proposalId, { type: "u32" }),
  ]);
  return decodeProposal(raw);
}

export async function hasVoted(
  sourceAddress: string,
  proposalId: number
): Promise<boolean> {
  return simulateCall(sourceAddress, "has_voted", [
    nativeToScVal(proposalId, { type: "u32" }),
    nativeToScVal(sourceAddress, { type: "address" }),
  ]);
}

/** `deadline` is a JS Date; converted to unix seconds for the contract. */
export async function createProposal(
  address: string,
  title: string,
  description: string,
  deadline: Date,
  onPhase?: (phase: TxPhase) => void
): Promise<number> {
  onPhase?.("preparing");
  const source = await server.getAccount(address);
  const deadlineSecs = Math.floor(deadline.getTime() / 1000);
  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        "create_proposal",
        nativeToScVal(address, { type: "address" }),
        nativeToScVal(title, { type: "string" }),
        nativeToScVal(description, { type: "string" }),
        nativeToScVal(deadlineSecs, { type: "u64" })
      )
    )
    .setTimeout(30)
    .build();

  let prepared;
  try {
    prepared = await server.prepareTransaction(tx);
  } catch (e) {
    onPhase?.("failed");
    throw decodeContractError(e);
  }

  onPhase?.("awaiting-signature");
  const signedTxXdr = await signWithWallet(prepared.toXDR(), address, NETWORK_PASSPHRASE);

  onPhase?.("submitting");
  const signedTx = TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE);
  const sendResult = await server.sendTransaction(signedTx);
  if (sendResult.status === "ERROR") {
    onPhase?.("failed");
    throw decodeContractError(sendResult.errorResult);
  }

  let getResult = await server.getTransaction(sendResult.hash);
  while (getResult.status === "NOT_FOUND") {
    await new Promise((r) => setTimeout(r, 1000));
    getResult = await server.getTransaction(sendResult.hash);
  }
  if (getResult.status !== "SUCCESS") {
    onPhase?.("failed");
    throw new Error(`Transaction failed with status: ${getResult.status}`);
  }
  onPhase?.("confirmed");
  if ("returnValue" in getResult && getResult.returnValue) {
    return Number(scValToNative(getResult.returnValue));
  }
  return -1;
}

export async function vote(
  address: string,
  proposalId: number,
  choice: VoteChoice,
  onPhase?: (phase: TxPhase) => void
): Promise<string> {
  return invoke(
    address,
    "vote",
    [
      nativeToScVal(address, { type: "address" }),
      nativeToScVal(proposalId, { type: "u32" }),
      xdr.ScVal.scvVec([xdr.ScVal.scvSymbol(choice)]),
    ],
    onPhase
  );
}

export async function executeProposal(
  address: string,
  proposalId: number,
  onPhase?: (phase: TxPhase) => void
): Promise<string> {
  return invoke(address, "execute_proposal", [nativeToScVal(proposalId, { type: "u32" })], onPhase);
}
