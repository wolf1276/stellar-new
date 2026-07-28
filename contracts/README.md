# Voting contract (Soroban)

```text
contracts/
├── contracts/voting/
│   ├── src/lib.rs     GovernanceContract: proposals, voting, execution
│   ├── src/test.rs    13 unit tests (cargo test)
│   └── Makefile        make build | make test | make fmt
├── deploy.sh           builds + deploys to a network, prints the contract ID
└── Cargo.toml          workspace root
```

## Build & test

```bash
cargo test                                    # unit tests
stellar contract build                        # -> target/wasm32v1-none/release/voting.wasm
```

## Deploy

```bash
./deploy.sh <stellar-keys-identity> testnet
```

See the top-level [README](../README.md) for the full app architecture,
deployed contract ID, and demo instructions.
