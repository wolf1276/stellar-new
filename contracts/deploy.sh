#!/usr/bin/env bash
# Builds and deploys the membership + voting contracts (in that order, since
# the voting contract's constructor takes the membership contract's address
# for its cross-contract eligibility check), then prints the values to set
# in the frontend's .env.
#
# Usage: ./deploy.sh <identity> [network]
#   identity  Name of a `stellar keys` identity to sign/pay for the deploy.
#   network   testnet (default) | futurenet | mainnet

set -euo pipefail

IDENTITY="${1:?Usage: ./deploy.sh <identity> [network]}"
NETWORK="${2:-testnet}"

cd "$(dirname "$0")"

echo "==> Building contracts"
stellar contract build

MEMBERSHIP_WASM=target/wasm32v1-none/release/membership.wasm
VOTING_WASM=target/wasm32v1-none/release/voting.wasm

echo "==> Deploying membership contract to $NETWORK as $IDENTITY"
MEMBERSHIP_ID=$(stellar contract deploy \
  --wasm "$MEMBERSHIP_WASM" \
  --source "$IDENTITY" \
  --network "$NETWORK")
echo "Membership contract ID: $MEMBERSHIP_ID"

echo "==> Deploying voting contract to $NETWORK as $IDENTITY"
VOTING_ID=$(stellar contract deploy \
  --wasm "$VOTING_WASM" \
  --source "$IDENTITY" \
  --network "$NETWORK" \
  -- --membership_contract "$MEMBERSHIP_ID")

echo ""
echo "Membership contract ID: $MEMBERSHIP_ID"
echo "Voting contract ID:     $VOTING_ID"
echo ""
echo "Set these in the frontend (.env.local or your host's env vars):"
echo "  NEXT_PUBLIC_VOTING_CONTRACT_ID=$VOTING_ID"
echo "  NEXT_PUBLIC_MEMBERSHIP_CONTRACT_ID=$MEMBERSHIP_ID"
