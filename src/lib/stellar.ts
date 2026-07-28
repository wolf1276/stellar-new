import { Horizon, Networks } from "@stellar/stellar-sdk";

export const NETWORK_PASSPHRASE = Networks.TESTNET;
export const HORIZON_URL = "https://horizon-testnet.stellar.org";

export const server = new Horizon.Server(HORIZON_URL);

export async function getBalances(publicKey: string) {
  const account = await server.loadAccount(publicKey);
  return account.balances;
}

/** Native XLM balance as a string, or "0" if the account holds none. */
export async function getXlmBalance(publicKey: string): Promise<string> {
  const balances = await getBalances(publicKey);
  const native = balances.find((b) => b.asset_type === "native");
  return native?.balance ?? "0";
}
