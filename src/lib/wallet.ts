import { Networks } from "@stellar/stellar-sdk";

export type WalletState = {
  address: string;
  network: string;
  networkPassphrase: string;
};

export class WalletUnavailableError extends Error {
  constructor() {
    super("No supported wallet extension found. Install Freighter, xBull, Rabet, or another Stellar wallet.");
    this.name = "WalletUnavailableError";
  }
}

export class WalletRejectedError extends Error {
  constructor(reason: string) {
    super(reason || "Connection request was rejected.");
    this.name = "WalletRejectedError";
  }
}

// The kit touches `localStorage` at import time, so it must only ever be loaded in the browser.
let kitPromise: Promise<typeof import("@creit.tech/stellar-wallets-kit/sdk").StellarWalletsKit> | null = null;
async function getKit() {
  if (typeof window === "undefined") throw new WalletUnavailableError();
  if (!kitPromise) {
    kitPromise = Promise.all([
      import("@creit.tech/stellar-wallets-kit/sdk"),
      import("@creit.tech/stellar-wallets-kit/modules/utils"),
    ]).then(([{ StellarWalletsKit }, { defaultModules }]) => {
      StellarWalletsKit.init({ modules: defaultModules(), network: Networks.TESTNET });
      return StellarWalletsKit;
    });
  }
  return kitPromise;
}

/** True if a wallet is already selected/connected, without prompting the user. */
export async function getAuthorizedState(): Promise<WalletState | null> {
  try {
    const kit = await getKit();
    const { address } = await kit.getAddress();
    if (!address) return null;
    return readCurrentState();
  } catch {
    return null;
  }
}

/** Opens the wallet-picker modal (Freighter, xBull, Rabet, Lobstr, Hana, WalletConnect, ...). */
export async function connectWallet(): Promise<WalletState> {
  const kit = await getKit();
  try {
    await kit.authModal();
  } catch (e) {
    throw new WalletRejectedError(e instanceof Error ? e.message : "Connection request was rejected.");
  }
  return readCurrentState();
}

export async function disconnectWallet(): Promise<void> {
  const kit = await getKit();
  await kit.disconnect();
}

/** Signs an XDR transaction envelope with the currently selected wallet. */
export async function signWithWallet(
  xdrEnvelope: string,
  address: string,
  networkPassphrase: string
): Promise<string> {
  const kit = await getKit();
  const { signedTxXdr } = await kit.signTransaction(xdrEnvelope, {
    address,
    networkPassphrase,
  });
  return signedTxXdr;
}

async function readCurrentState(): Promise<WalletState> {
  const kit = await getKit();
  const [{ address }, { network, networkPassphrase }] = await Promise.all([
    kit.getAddress(),
    kit.getNetwork(),
  ]);
  if (!address) throw new WalletRejectedError("No address returned by the wallet.");
  return { address, network, networkPassphrase };
}
