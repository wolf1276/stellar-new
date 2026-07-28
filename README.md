# Stellar Governance Voting dApp

A Next.js 15+ (App Router) dApp for wallet-connected governance voting on
Stellar/Soroban Testnet. Connect Freighter, view your live XLM balance, send
XLM, and cast votes on-chain against a deployed Soroban voting contract.

## Overview

- **Wallet**: connect/disconnect Freighter, auto-reconnect on reload, polls
  for account/network switches made inside the extension.
- **Balance**: live XLM balance from Horizon (no mock data), with
  loading/error/refresh states.
- **Transactions**: send XLM with client-side validation, loading/success/error
  feedback, tx hash + Stellar Expert link.
- **Voting**: reads candidates/votes from the Soroban contract and submits a
  signed `vote` invocation via Freighter (`src/components/VotingApp.tsx`,
  `src/lib/voting-contract.ts`).

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:3000. You'll need the [Freighter](https://freighter.app)
browser extension, set to **Testnet**, with a funded testnet account (use
[Friendbot](https://friendbot.stellar.org)).

## Environment variables

None required — Horizon/Soroban RPC URLs and network passphrase are fixed to
Stellar Testnet in `src/lib/stellar.ts`. If you need configurable endpoints
(e.g. to target mainnet), promote those constants to `NEXT_PUBLIC_*` env vars.

## Folder structure

```
src/
  app/            Routes (App Router) — page.tsx composes WalletCard + VotingApp
  components/
    ui/           Minimal shadcn/ui-style primitives (Button, Card, Input, Alert)
    WalletCard.tsx     Connect/disconnect + wallet address/network
    BalanceCard.tsx    XLM balance display + refresh
    SendXlmForm.tsx    Send-XLM form with validation and tx feedback
    VotingApp.tsx      Governance voting UI (contract-backed)
  hooks/
    useWallet.ts       Freighter connection state, auto-reconnect, change polling
    useBalance.ts      XLM balance fetch/refresh
    useTransaction.ts  Payment send lifecycle (idle/pending/success/error)
  lib/
    stellar.ts         Horizon server, network passphrase, balance helpers
    wallet.ts          Freighter service calls (connect/authorize/read state)
    transaction.ts     Build/sign/submit XLM payments, address/amount validation
    voting-contract.ts Soroban contract read/write calls for voting
    utils.ts           cn() class-merging helper
contracts/        Soroban voting contract (Rust/Cargo workspace)
```

UI/hooks/services are kept separate: components only call hooks, hooks only
call `lib/*`, and `lib/*` is the only layer that touches Freighter/Horizon/Soroban.

## Local run

```bash
npm run dev      # http://localhost:3000
npm run lint
npm run build && npm run start
```

## Deployment

Deploy as a standard Next.js app (e.g. Vercel: `vercel deploy`). No server-side
secrets are required since all wallet/chain interaction happens client-side
through Freighter.

## Wallet flow

1. User clicks **Connect Freighter Wallet** → `useWallet.connect()`.
2. `lib/wallet.ts` checks the extension is installed (`isConnected`), requests
   authorization (`setAllowed`/`requestAccess`), then reads address + network.
3. Connection is persisted (`localStorage` flag) so a page reload silently
   re-authorizes via `getAuthorizedState()` instead of re-prompting.
4. While connected, the hook polls Freighter every 3s to detect an account
   switch or network change and updates state accordingly; if the site is no
   longer authorized, it disconnects.
5. Errors (extension missing, request rejected) surface as inline alerts.

## Transaction flow

1. User enters a recipient and amount in `SendXlmForm`.
2. Client-side validation (`isValidStellarAddress`, `isValidAmount`) runs
   before anything is submitted.
3. `useTransaction.send()` calls `lib/transaction.ts`, which loads the source
   account from Horizon, builds a native-asset `Operation.payment`, and asks
   Freighter to sign it.
4. The signed transaction is submitted to Horizon; the resulting hash is
   shown along with a link to `stellar.expert` for the testnet explorer.
5. Loading/success/error states are reflected in the form the entire time.

## Submission assets

Screenshots to capture for submission:

1. Wallet connect — the initial "Connect Freighter Wallet" button state.
2. Connected state — wallet card showing truncated address + network.
3. Balance — the balance card with a real testnet XLM amount.
4. Successful transaction — the success alert after sending XLM.
5. Transaction hash — the tx hash + Stellar Expert link visible in the UI.
