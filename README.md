# Stellar Governance Voting dApp

![CI](https://github.com/wolf1276/stellar-new/actions/workflows/ci.yml/badge.svg)

A Next.js 16 (App Router) dApp for wallet-connected governance voting on
Stellar/Soroban Testnet. Connect any supported Stellar wallet, view your live
XLM balance, send XLM, and cast votes on-chain against a deployed Soroban
voting contract.

## Architecture

```
Wallet (Freighter/xBull/...) ──sign──▶ Stellar Wallet Kit ──▶ lib/wallet.ts
                                                                    │
Next.js UI (app/*) ──▶ hooks/* (state, polling) ──▶ lib/* ─────────┤
                                                                    ▼
                                          Horizon (balance/payments)
                                          Soroban RPC (voting-contract.ts)
                                                                    │
                                                                    ▼
                                    GovernanceContract (contracts/contracts/voting)
                                    persistent storage: proposals, per-voter vote flags
                                    emits: ProposalCreated, VoteCast, ProposalClosed,
                                           ProposalExecuted (Soroban events)
```

Layering is one-directional: components only call hooks, hooks only call
`lib/*`, and `lib/*` is the only layer that touches the wallet kit, Horizon,
or Soroban RPC (see [Folder structure](#folder-structure)).

**Inter-contract communication**: `GovernanceContract` calls a second deployed
contract, `MembershipContract` (`contracts/contracts/membership`), across
contract boundaries. `vote()` invokes `MembershipContractClient::is_member()`
on the address stored in `GovernanceContract`'s constructor
(`__constructor(membership_contract: Address)`) and rejects the vote with
`Error::Unauthorized` if the caller hasn't `join()`-ed. This is a real
cross-contract call (not a mock) — see
`contracts/contracts/voting/src/lib.rs::vote()` and the
`test_vote_by_non_member_fails` / cross-contract test coverage in
`src/test.rs`. Membership is open self-registration for this demo; swap
`MembershipContract::join()` for an admin-gated or token-balance-gated check
to restrict who can vote.

On the frontend, `src/lib/membership-contract.ts` calls the membership
contract directly (`is_member`, `join`), and `useProposal` surfaces a
"Join to Vote" gate on the proposal detail page before Yes/No voting is
enabled.

## Features

- **Multi-wallet connect**: Freighter, xBull, Rabet, Lobstr, Hana, WalletConnect,
  and more via [Stellar Wallet Kit](https://stellarwalletskit.dev/) — one
  picker modal, one signing API, no per-wallet code. Auto-reconnects on reload,
  polls for account/network switches made inside the wallet.
- **Balance**: live XLM balance from Horizon (no mock data), with
  loading/error/refresh states.
- **Transactions**: send XLM with client-side validation and a full lifecycle
  (Preparing → Awaiting signature → Submitting → Confirmed/Failed), tx hash +
  Stellar Expert link.
- **Governance voting**: create proposals, cast Yes/No votes, and execute
  proposals after their deadline against a deployed Soroban contract
  (`src/lib/voting-contract.ts`). The proposal list and detail views poll the
  contract every 6s so votes cast by other wallets appear without a refresh.
- **User-friendly error handling**: wallet-unavailable, wallet-rejected,
  invalid-address/amount, and 8 distinct on-chain contract errors (already
  voted, voting closed, invalid deadline, etc.) are all decoded into plain
  messages — see the audit table below.

## Supported wallets

Freighter, xBull, Rabet, Lobstr, Hana, WalletConnect, Hot Wallet, Klever,
OneKey, Bitget — anything the installed [Stellar Wallet Kit](https://stellarwalletskit.dev/)
version supports. Click **Connect Wallet** to open the picker.

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:3000. You'll need a supported wallet (e.g.
[Freighter](https://freighter.app)) set to **Testnet**, with a funded testnet
account (use [Friendbot](https://friendbot.stellar.org)).

## Deployed contract (Testnet)

- **Contract ID**: `CADQY6OJA3PZOPWIHHTJ7T67LFJJPLDDFE2UYDPJWPQVXONXM7JRSDIU`
- **Explorer**: https://stellar.expert/explorer/testnet/contract/CADQY6OJA3PZOPWIHHTJ7T67LFJJPLDDFE2UYDPJWPQVXONXM7JRSDIU
- **Example transaction** (sample `create_proposal` call): `210388aa03524f08885e9d0e4b256b1589df97f6e2d894bc5870204d400e546b`
  https://stellar.expert/explorer/testnet/tx/210388aa03524f08885e9d0e4b256b1589df97f6e2d894bc5870204d400e546b
- **Example transaction** (sample `vote` call): `0b42c7ccbeecfcbe54241f4e7ca1c066aebb5c574c51045afaf598547f38b89b`
  https://stellar.expert/explorer/testnet/tx/0b42c7ccbeecfcbe54241f4e7ca1c066aebb5c574c51045afaf598547f38b89b

Rebuild/redeploy from source with the deploy script (builds, deploys, prints
the new contract ID):

```bash
cd contracts
./deploy.sh <your-stellar-keys-identity> testnet
```

or by hand:

```bash
cd contracts
stellar contract build
stellar contract deploy --wasm target/wasm32v1-none/release/voting.wasm \
  --source <your-identity> --network testnet
```

Then set `NEXT_PUBLIC_VOTING_CONTRACT_ID` (see below) or update the fallback
in `src/lib/voting-contract.ts`.

> The contract ID above predates the membership cross-contract check and has
> no constructor arg, so it runs ungated (anyone can vote — same behavior as
> before). The frontend degrades to this automatically: it only calls the
> membership contract when `NEXT_PUBLIC_MEMBERSHIP_CONTRACT_ID` is set. To
> get the gated behavior, redeploy both contracts with `./deploy.sh` and set
> both env vars.

## Environment variables

None required — Horizon/Soroban RPC URLs, network passphrase, and the voting
contract ID default to Stellar Testnet. See `.env.example`. To point at a
different deployment, set:

```bash
NEXT_PUBLIC_VOTING_CONTRACT_ID=C...
NEXT_PUBLIC_MEMBERSHIP_CONTRACT_ID=C...   # optional — enables the join-gate
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
```

## Monitoring & analytics

[`@vercel/analytics`](https://vercel.com/docs/analytics) and
[`@vercel/speed-insights`](https://vercel.com/docs/speed-insights) are wired
into `src/app/layout.tsx`. Both are no-ops locally and on non-Vercel hosts;
once deployed on Vercel, enable Analytics and Speed Insights for the project
in the dashboard (Project → Analytics / Speed Insights) — no extra
credentials or code changes needed. Runtime errors are caught by
`src/app/error.tsx` (route-level) and logged to the console; wire that
`console.error` to an error-tracking service (e.g. Sentry) if one is added.

## Folder structure

```
src/
  app/
    proposals/         List, detail (vote/execute), and create-proposal routes
    wallet/            Wallet connect + balance + send-XLM route
  components/
    ui/           Minimal shadcn/ui-style primitives (Button, Card, Input, Alert)
    WalletCard.tsx     Connect/disconnect + wallet address/network
    BalanceCard.tsx    XLM balance display + refresh
    SendXlmForm.tsx    Send-XLM form with validation and tx-phase feedback
    StatusBadge.tsx    Proposal status pill (Active/Closed/Executed)
    NetworkWarning.tsx Alerts if the wallet is on the wrong network
  hooks/
    useWallet.ts       Wallet-kit connection state, auto-reconnect, change polling
    useBalance.ts      XLM balance fetch/refresh
    useTransaction.ts  Payment send lifecycle (preparing/awaiting-signature/submitting/confirmed/failed)
    useProposals.ts    Proposal list/detail/create, vote/execute actions, 6s live polling
  lib/
    stellar.ts         Horizon server, network passphrase, balance helpers
    wallet.ts          Stellar Wallet Kit setup (connect/sign/disconnect, multi-wallet)
    transaction.ts     Build/sign/submit XLM payments, address/amount validation
    voting-contract.ts Soroban voting-contract read/write calls + on-chain error decoding
    membership-contract.ts  Soroban membership-contract calls (is_member/join)
    utils.ts           cn() class-merging helper
contracts/        Soroban contracts (Rust/Cargo workspace): voting + membership
```

UI/hooks/services are kept separate: components only call hooks, hooks only
call `lib/*`, and `lib/*` is the only layer that touches the wallet kit,
Horizon, or Soroban RPC.

## Local run

```bash
npm run dev        # http://localhost:3000
npm run lint
npm run typecheck
npm test           # vitest
npm run build && npm run start
```

## Testing

- **Contract** (`contracts/contracts/voting/src/test.rs`,
  `contracts/contracts/membership/src/test.rs`): 16 tests covering proposal
  creation/validation, voting (yes/no, duplicate, after-deadline, non-member
  rejection via the cross-contract membership check), auto-close on expiry,
  execute (pass/fail, before-deadline, twice), and membership join/is_member.
  Run with `cd contracts && cargo test`.
- **Frontend** (`src/lib/*.test.ts`): unit tests for address/amount
  validation and on-chain error decoding. Run with `npm test` (vitest).

Both suites run in CI on every push/PR (see badge above).

## CI/CD

`.github/workflows/ci.yml` runs two jobs on every push and PR:

- **frontend**: `npm ci` → lint → typecheck → test → production build.
- **contracts**: `cargo fmt --check` → `cargo test` → `cargo build --release
  --target wasm32v1-none`.

Deployment to Soroban is manual (`contracts/deploy.sh`, see above) rather than
automated in CI, since it requires a funded signing identity — a deploy step
would need that key stored as a CI secret, which is out of scope for a
testnet demo project.

## Demo instructions

1. `npm install && npm run dev`, open http://localhost:3000.
2. Install [Freighter](https://freighter.app), switch it to **Testnet**, and
   fund the account via [Friendbot](https://friendbot.stellar.org).
3. Click **Launch App** → **Connect Wallet**.
4. **Wallet** tab: view live XLM balance, send a small XLM payment, watch the
   Preparing → Awaiting signature → Submitting → Confirmed lifecycle.
5. **Proposals** tab: create a proposal, then open it and cast a vote (or
   connect a second funded testnet account and vote from there) — vote counts
   update within 6s on both without a page refresh.
6. After the deadline passes, click **Execute** to finalize the proposal.

## Deployment

Deploy as a standard Next.js app (e.g. Vercel: `vercel deploy`). No server-side
secrets are required since all wallet/chain interaction happens client-side.
Set `NEXT_PUBLIC_VOTING_CONTRACT_ID` (and optionally
`NEXT_PUBLIC_SOROBAN_RPC_URL`) as environment variables on the host if you've
deployed your own contract instance instead of using the one below.

Route-level `error.tsx`/`not-found.tsx` boundaries and `@vercel/analytics` /
`@vercel/speed-insights` are already in place (see Monitoring & analytics
above) — no further setup needed beyond enabling them in the Vercel
dashboard post-deploy.

## Wallet flow

1. User clicks **Connect Wallet** → `useWallet.connect()` → `lib/wallet.ts`
   opens the Stellar Wallet Kit picker modal (Freighter, xBull, Rabet, Lobstr,
   Hana, WalletConnect, ...).
2. The kit persists the selected wallet itself, so a page reload silently
   re-authorizes via `getAuthorizedState()` instead of re-prompting.
3. While connected, the hook polls every 3s to detect an account switch or
   network change and updates state accordingly; if no longer authorized, it
   disconnects.
4. `NetworkWarning` flags a mismatch if the wallet isn't on Testnet.
5. Errors (no wallet available, request rejected) surface as inline alerts.

## Transaction flow

Every payment and contract call goes through the same five-phase lifecycle,
surfaced in the UI as button/status text and a tx hash + Stellar Expert link
on completion:

**Preparing → Awaiting signature → Submitting → Confirmed / Failed**

1. User enters a recipient/amount (`SendXlmForm`) or picks a vote (proposal
   detail page).
2. Client-side validation (`isValidStellarAddress`, `isValidAmount`) runs
   before anything is submitted.
3. **Preparing**: the source account is loaded from Horizon/Soroban RPC and
   the transaction is built (and simulated, for contract calls).
4. **Awaiting signature**: the connected wallet is asked to sign via
   `lib/wallet.ts#signWithWallet`.
5. **Submitting**: the signed envelope is sent to Horizon/Soroban RPC.
6. **Confirmed**: the tx hash is shown with a link to `stellar.expert`.
   **Failed**: the error (validation, wallet rejection, or a decoded on-chain
   contract error) is shown inline.

## Error handling

| Case | Where | Message |
|---|---|---|
| No wallet extension installed | `lib/wallet.ts` (`WalletUnavailableError`) | "No supported wallet extension found..." |
| Connection rejected by user | `lib/wallet.ts` (`WalletRejectedError`) | wallet-provided rejection reason |
| Wrong network selected | `NetworkWarning.tsx` | "Freighter is set to X, but this app runs on Testnet." |
| Invalid recipient address | `lib/transaction.ts` (`isValidStellarAddress`) | "Enter a valid Stellar public key..." |
| Invalid/zero amount | `lib/transaction.ts` (`isValidAmount`) | "Enter an amount greater than 0." |
| On-chain contract errors (8 codes) | `lib/voting-contract.ts` (`decodeContractError`) | e.g. "This wallet has already voted on this proposal.", "Voting is closed for this proposal." |
| Transaction submission/RPC failure | `lib/transaction.ts`, `lib/voting-contract.ts` | surfaced via `status: "failed"` + error alert |

## Live updates

`useProposalList`/`useProposal` (`src/hooks/useProposals.ts`) poll the Soroban
contract every 6s and refresh silently (no loading flicker), so new proposals
and vote counts cast by other wallets appear automatically.

## Submission assets

Screenshots to capture for submission:

1. Wallet picker — the Stellar Wallet Kit modal showing multiple wallet options.
2. Connected state — wallet card showing truncated address + network.
3. Balance — the balance card with a real testnet XLM amount.
4. Transaction lifecycle — the button mid-flow (e.g. "Awaiting signature...").
5. Confirmed transaction — the tx hash + Stellar Expert link visible in the UI.
