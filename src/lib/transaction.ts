import {
  TransactionBuilder,
  BASE_FEE,
  Operation,
  Asset,
  StrKey,
} from "@stellar/stellar-sdk";
import { signTransaction } from "@stellar/freighter-api";
import { server, NETWORK_PASSPHRASE } from "./stellar";

export function isValidStellarAddress(address: string): boolean {
  return StrKey.isValidEd25519PublicKey(address);
}

export function isValidAmount(amount: string): boolean {
  const value = Number(amount);
  return Number.isFinite(value) && value > 0;
}

/** Builds, signs (via Freighter) and submits an XLM payment. Returns the tx hash. */
export async function sendPayment(
  sourceAddress: string,
  destination: string,
  amount: string
): Promise<string> {
  if (!isValidStellarAddress(destination)) {
    throw new Error("Recipient address is not a valid Stellar public key.");
  }
  if (!isValidAmount(amount)) {
    throw new Error("Amount must be a positive number.");
  }

  const account = await server.loadAccount(sourceAddress);
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(Operation.payment({ destination, asset: Asset.native(), amount }))
    .setTimeout(30)
    .build();

  const { signedTxXdr, error } = await signTransaction(tx.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
  });
  if (error) throw new Error(error);

  const signedTx = TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE);
  const result = await server.submitTransaction(signedTx);
  return result.hash;
}

export function stellarExpertTxUrl(hash: string): string {
  return `https://stellar.expert/explorer/testnet/tx/${hash}`;
}
