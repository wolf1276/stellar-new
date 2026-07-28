import {
  Contract,
  rpc,
  TransactionBuilder,
  BASE_FEE,
  nativeToScVal,
  scValToNative,
} from "@stellar/stellar-sdk";
import { signWithWallet } from "./wallet";
import { NETWORK_PASSPHRASE } from "./stellar";
import type { TxPhase } from "./transaction";
import { decodeContractError } from "./voting-contract";

/**
 * `GovernanceContract.vote()` calls this contract's `is_member` cross-contract
 * to gate voting eligibility (see contracts/contracts/membership). Optional:
 * if unset, the app assumes the voting contract wasn't deployed with a
 * membership gate and skips the join step.
 */
export const MEMBERSHIP_CONTRACT_ID = process.env.NEXT_PUBLIC_MEMBERSHIP_CONTRACT_ID ?? null;

const RPC_URL =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ?? "https://soroban-testnet.stellar.org";

const server = new rpc.Server(RPC_URL);

export async function isMember(address: string): Promise<boolean> {
  if (!MEMBERSHIP_CONTRACT_ID) return true;
  const contract = new Contract(MEMBERSHIP_CONTRACT_ID);
  const source = await server.getAccount(address);
  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call("is_member", nativeToScVal(address, { type: "address" })))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) throw decodeContractError(sim.error);
  return scValToNative(sim.result!.retval);
}

export async function joinMembership(
  address: string,
  onPhase?: (phase: TxPhase) => void
): Promise<string> {
  if (!MEMBERSHIP_CONTRACT_ID) throw new Error("No membership contract configured.");
  const contract = new Contract(MEMBERSHIP_CONTRACT_ID);

  onPhase?.("preparing");
  const source = await server.getAccount(address);
  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call("join", nativeToScVal(address, { type: "address" })))
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
