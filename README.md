# Popper — Falsifiable Investment Thesis for NEAR

Popper is an on-chain pre-registration system for a blockchain investment
thesis. Instead of publishing an opinion after the data arrives, an author
freezes measurable claims, hashes the exact `claims.json`, and commits that
hash to NEAR. Later verification runs against hash-pinned snapshots and
produces deterministic `HOLDING`, `AT_RISK`, or `FALSIFIED` results.

The project is named after Karl Popper: a thesis is meaningful only when it
can be falsified.

**Repository:** <https://github.com/trinnode/popper>  
**License:** MIT  
**Hackathon track:** Investment Thesis

## Why Popper is different

Most crypto theses are mutable essays. Popper makes the important parts
auditable:

- claims are written before their measurement windows;
- the exact claim file is committed on-chain as a SHA-256 digest;
- every data snapshot is independently hashable;
- evaluation is deterministic TypeScript, not an LLM judgment;
- the contract makes commitments and attestations append-only;
- a skeptical reader can inspect the source, replay the engine, and compare
  the result with the on-chain record.

The contract does not pretend to be an oracle. External data still needs an
attester, so the trust boundary and admin role are documented in the contract
and UI. NEAR provides ordering and permanence; public reproducibility provides
the evidence layer.

## Product flow

```text
claims.json
    │
    ├── SHA-256 ──> store_commit() on NEAR
    │
    └── public APIs ──> dated snapshot ──> snapshot hash
                                             │
                                  deterministic evaluator
                                             │
                                      results.json
                                             │
                              store_result() on NEAR
                                             │
                                  scoreboard / proof explorer
```

1. Define a claim with a metric, source, threshold, kill condition, and
   measurement window.
2. Run the claim hash command before the window opens.
3. Store the hash through the Popper contract.
4. Pull public source data into a dated snapshot and record its SHA-256.
5. Evaluate the snapshot with the engine.
6. Attest the immutable result on NEAR.
7. Let anyone inspect the proof, source URL, snapshot hash, and verdict.

## Repository map

```text
claims.json                         Frozen thesis specification
packages/contract/                  Rust NEAR commitment contract
packages/contract/src/tests.rs      Contract unit tests
packages/engine/                    Deterministic hashing/evaluation library
packages/cli/                       Judge/operator command line interface
packages/web/                       Next.js scoreboard and proof explorer
snapshots/                          Published, hash-pinned source data
results/                            Published verification outputs
research/                           Methodology and source notes
scripts/                            Contract/snapshot operational scripts
.env.example                        Documented public and secret configuration
```

## Quick start

Requirements: Node.js 20+, pnpm 10+, Rust 1.95+ for the current NEAR SDK
dependency, and a NEAR account only for on-chain writes.

```bash
git clone https://github.com/trinnode/popper
cd popper
pnpm install

# Fast deterministic checks
pnpm test:engine
pnpm --filter @popper/cli run typecheck
pnpm --filter @popper/cli run verify

# Contract tests
rustup run 1.95.0 cargo test --manifest-path packages/contract/Cargo.toml

# Production web build
pnpm --filter @popper/web run build

# Local UI
pnpm dev
```

The CLI verification command is safe on a cold clone. If no published
snapshots or contract commitment exist yet, the web UI reports that state
explicitly rather than fabricating a successful verification.

## Web experience

The Next.js app includes:

- `/` — thesis hero, commitment summary, and navigation;
- `/scoreboard` — claim statuses, thresholds, margins, and verification CTA;
- `/proof` — commitment and snapshot integrity explorer;
- `/how-it-works` — protocol and trust-model explanation;
- `/api/state` — read-only normalized state endpoint;
- `/api/verify` — offline integrity verification endpoint.

The visual system is intentionally dark and technical: Geist typography,
monospace values, NEAR green, hash/terminal treatments, accessible focus
states, and a full footer linking the public evidence.

## Claim and snapshot integrity

`claims.json` is the canonical specification. Do not edit it after the
commitment has been stored. If a thesis needs revision, create a new version
and a new on-chain commitment.

Published snapshots must:

1. contain the raw response or normalized source data;
2. include a timestamp and source URL;
3. appear in `snapshots/manifest.json`;
4. have a matching SHA-256 digest;
5. be committed to git before the result is attested.

Unpublished local files belong under `snapshots/local/` and are ignored by git.
Attestation output belongs under `results/`; experimental output belongs under
`results/local/`.

## Configuration

```bash
cp .env.example .env
```

The template documents the public NEAR RPC, DefiLlama, CoinGecko, contract
account, optional CoinGecko key, optional Pinata JWT, and local admin account.
Public API keys may be placed in local environment configuration when needed.
Never put a NEAR private key, seed phrase, admin credential, or JWT in git,
browser code, CI logs, or `.env.example`.

The admin key is loaded from the local NEAR credential store by deployment
scripts. Use a hardware-backed or dedicated deployer account for production.

## Contract security model

The contract enforces:

- one-time initialization;
- admin-only writes;
- immutable thesis commitment;
- one result per claim ID;
- strict lowercase SHA-256 validation;
- bounded result views;
- attached-deposit refunds;
- NEP-297-style event logs.

The contract intentionally does **not** claim to fetch or validate DefiLlama,
CoinGecko, or explorer data on-chain. The admin/attester can still refuse to
attest or submit an incorrect value. Reproducible source snapshots and the
public engine are the mitigation, and the limitation is displayed to judges.

## Deployment sequence

Deploy to testnet first:

1. install `near-cli-rs` or `cargo-near`;
2. configure `POPPER_ADMIN_ACCOUNT_ID` and RPC values locally;
3. build the WASM release artifact;
4. deploy and initialize the contract;
5. run `store_commit` with the frozen claims hash;
6. publish the transaction and contract ID in the README/submission;
7. run snapshot, evaluate, and attestation flows;
8. repeat on mainnet only after reviewing the exact hash and account.

The repository does not invent a mainnet transaction, commitment block, or
snapshot result. Those are deployment outputs and must be added after a real
deployment.

## CI

GitHub Actions runs:

- engine/CLI tests on Node 20 and 22;
- contract tests, formatting, clippy, and WASM build;
- Next.js production build;
- claims integrity checks.

Run the same checks locally before opening a PR. Keep generated `.next`,
`target`, credentials, local snapshots, and local results out of commits.

## Known boundaries before mainnet launch

- The contract needs a real deployed account ID and first commitment.
- Public data APIs are rate limited; production should use caching and pinned
  snapshots.
- External attestation is transparent but not trustless.
- Wallet signing and deployment are intentionally operator-controlled.
- A production launch should add scheduled snapshot automation, alerting, and
  an independent review of the deployed contract bytecode.

## Judge demo

```bash
pnpm install
pnpm test:engine
pnpm --filter @popper/cli run verify
pnpm dev
```

Open the landing page, inspect the scoreboard, run **Verify Now**, and follow
the proof links. The most important demonstration is that the claim hash and
snapshot integrity checks can fail loudly instead of returning a success-shaped
fallback.
