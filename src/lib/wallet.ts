import {
  isConnected,
  isAllowed,
  setAllowed,
  requestAccess,
  getAddress,
  getNetwork,
} from "@stellar/freighter-api";

export type WalletState = {
  address: string;
  network: string;
  networkPassphrase: string;
};

export class WalletUnavailableError extends Error {
  constructor() {
    super("Freighter wallet extension not found. Install it from freighter.app.");
    this.name = "WalletUnavailableError";
  }
}

export class WalletRejectedError extends Error {
  constructor(reason: string) {
    super(reason || "Connection request was rejected.");
    this.name = "WalletRejectedError";
  }
}

async function requireFreighter() {
  const { isConnected: available } = await isConnected();
  if (!available) throw new WalletUnavailableError();
}

/** True if the site is already authorized, without prompting the user. */
export async function getAuthorizedState(): Promise<WalletState | null> {
  const { isConnected: available } = await isConnected();
  if (!available) return null;

  const { isAllowed: allowed } = await isAllowed();
  if (!allowed) return null;

  return readCurrentState();
}

/** Prompts the user via the Freighter popup and returns the connected state. */
export async function connectWallet(): Promise<WalletState> {
  await requireFreighter();

  const allowed = await setAllowed();
  if (allowed.error || !allowed.isAllowed) {
    const access = await requestAccess();
    if (access.error) throw new WalletRejectedError(access.error);
  }

  return readCurrentState();
}

async function readCurrentState(): Promise<WalletState> {
  const [{ address, error: addrError }, { network, networkPassphrase, error: netError }] =
    await Promise.all([getAddress(), getNetwork()]);

  if (addrError) throw new WalletRejectedError(addrError);
  if (netError) throw new WalletRejectedError(netError);

  return { address, network, networkPassphrase };
}
