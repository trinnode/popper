/*!
# Popper contract

Popper stores an on-chain, pre-registered, falsifiable investment thesis.
It holds exactly two kinds of immutable facts:

1. A **commitment** made BEFORE the measurement windows open: the SHA-256
   hash of `claims.json` plus the NEAR block height and block timestamp at
   which the commitment was stored. The block height is what proves the
   claims were registered before the data used to judge them existed.
2. Per-claim **verification results** attested AFTER the deadlines pass.

## Trust model (stated honestly)

The `admin` account is trusted for *which* values get attested: the contract
cannot fetch external data, so it cannot force the admin to upload truthful
measurements. If the admin refuses to attest, claims stay `Pending` forever;
if the admin uploads wrong numbers, the contract stores them as-is.

What the contract removes is the ability to *rewrite history*:

- The commitment is immutable once stored, so the claims specification
  cannot be edited after results are known ("moving the goalposts").
- Each claim result is immutable once attested, so a verdict cannot be
  silently changed later.
- Every mutation requires the admin signature, so third parties cannot
  tamper with either record.
- Every input to `store_commit` and `store_result` is a deterministic
  output of the public Popper engine (a TypeScript codebase anyone can
  read and re-run). The claims hash is `sha256(claims.json)`; the data
  snapshot hash pins the exact fetched dataset; status, measured value,
  threshold and distance-to-kill are pure functions of the claims spec
  and the snapshot. A skeptical third party can re-run the public engine
  against the pinned snapshot hash and check that the admin attested the
  values the engine produces, or call the admin out publicly if they did
  not. The chain guarantees permanence and ordering; public verifiability
  of the values themselves comes from this re-runability, not from the
  contract being able to fetch data itself.

## Events

Mutations emit NEP-297 style standard events, one JSON object per log line:

`{"standard":"popper","version":"1.0.0","event":"...","data":[...]}`

## Build

Wasm release build (size optimized via `[profile.release]`):

```sh
cargo build --target wasm32-unknown-unknown --release
```
*/

use near_sdk::collections::{UnorderedMap, Vector};
use near_sdk::{env, near, require, AccountId, PanicOnDefault, Promise};

/// Upper bound on how many entries the unpaginated view methods return.
/// Keeps view calls cheap and bounded no matter how many results exist.
const MAX_VIEW_LIMIT: u64 = 500;

/// Version reported by `version()` and used in the event standard field.
pub const CONTRACT_VERSION: &str = env!("CARGO_PKG_VERSION");

/// Commitment stored before any measurement window opens. Immutable once set.
#[near(serializers = [json, borsh])]
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ThesisCommit {
    /// SHA-256 of claims.json, 64 lowercase hex characters.
    pub claims_hash: String,
    /// NEAR block height at commit time. Proves the claims predate the data.
    pub commit_block: u64,
    /// Block timestamp in nanoseconds at commit time.
    pub commit_timestamp: u64,
    /// Optional backup location of claims.json on IPFS.
    pub ipfs_cid: Option<String>,
    /// Human readable author of the thesis (e.g. the builder handle).
    pub author: String,
}

/// Attested verification result for one claim. Immutable once stored.
#[near(serializers = [json, borsh])]
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ClaimResult {
    /// Claim identifier, e.g. "intents_volume_growth".
    pub claim_id: String,
    /// Verdict produced by the public verification engine.
    pub status: ClaimStatus,
    /// Actual metric value as a string, exactly as the engine reported it.
    pub measured_value: String,
    /// What the claim required, as a string for display.
    pub threshold: String,
    /// How far the measured value is from the kill condition.
    pub distance_to_kill: String,
    /// SHA-256 of the data snapshot used, 64 lowercase hex characters.
    /// Anyone can re-run the engine against this pinned snapshot.
    pub data_snapshot_hash: String,
    /// NEAR block height at attestation time.
    pub result_block: u64,
    /// Block timestamp in nanoseconds at attestation time.
    pub result_timestamp: u64,
}

/// Lifecycle status of a claim.
#[near(serializers = [json, borsh])]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ClaimStatus {
    /// Deadline has not passed yet, or no result was attested.
    Pending,
    /// Claim holds: the threshold is met.
    Holding,
    /// Claim is drifting toward its kill condition.
    AtRisk,
    /// Kill condition triggered: the thesis is falsified for this claim.
    Falsified,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct PopperContract {
    /// Pre-registered commitment, None until `store_commit` is called.
    thesis_commitment: Option<ThesisCommit>,
    /// Per-claim results keyed by claim id.
    claim_results: UnorderedMap<String, ClaimResult>,
    /// The only account allowed to write commitments and results.
    admin: AccountId,
    /// Insertion order of claim ids so results can be enumerated
    /// deterministically (UnorderedMap alone has no stable order).
    result_order: Vector<String>,
}

#[near]
impl PopperContract {
    /// One-time initialization. The contract itself needs no deposit, so
    /// any attached deposit is refunded to the caller.
    #[init]
    #[payable]
    pub fn init(admin: AccountId) -> Self {
        // PanicOnDefault means regular methods cannot run before init, but
        // init itself could still be called twice on a deployed contract and
        // would otherwise silently overwrite the state. The SDK stores the
        // contract state under the well known key b"STATE", so its presence
        // proves the contract has already been initialized.
        require!(
            env::storage_read(b"STATE").is_none(),
            "Contract already initialized"
        );
        Self::refund_attached_deposit();
        Self {
            thesis_commitment: None,
            claim_results: UnorderedMap::new(b"r"),
            admin,
            result_order: Vector::new(b"o"),
        }
    }

    /// Store the immutable pre-registration commitment. Admin only.
    ///
    /// The block height and timestamp are captured on-chain at call time and
    /// are the timestamped proof that the claims existed before measurement.
    #[payable]
    pub fn store_commit(&mut self, claims_hash: String, ipfs_cid: Option<String>, author: String) {
        self.assert_admin();
        require!(
            self.thesis_commitment.is_none(),
            "Commitment already stored: the pre-registration is immutable"
        );
        require!(
            is_sha256_hex(&claims_hash),
            "claims_hash must be exactly 64 lowercase hex characters (sha256)"
        );
        require!(!author.is_empty(), "author must not be empty");

        Self::refund_attached_deposit();

        let commit = ThesisCommit {
            claims_hash,
            commit_block: env::block_height(),
            commit_timestamp: env::block_timestamp(),
            ipfs_cid,
            author,
        };
        env::log_str(&event_json(
            "commit_stored",
            &near_sdk::serde_json::json!({
                "claims_hash": commit.claims_hash,
                "commit_block": commit.commit_block,
                "commit_timestamp": commit.commit_timestamp,
                "ipfs_cid": commit.ipfs_cid,
                "author": commit.author,
            }),
        ));
        self.thesis_commitment = Some(commit);
    }

    /// Attest the verification result for one claim. Admin only.
    ///
    /// Results are immutable: a claim id can only ever be attested once.
    #[payable]
    pub fn store_result(
        &mut self,
        claim_id: String,
        status: ClaimStatus,
        measured_value: String,
        threshold: String,
        distance_to_kill: String,
        data_snapshot_hash: String,
    ) {
        self.assert_admin();
        require!(!claim_id.is_empty(), "claim_id must not be empty");
        require!(
            self.claim_results.get(&claim_id).is_none(),
            "Result already attested for this claim: results are immutable"
        );
        require!(
            is_sha256_hex(&data_snapshot_hash),
            "data_snapshot_hash must be exactly 64 lowercase hex characters (sha256)"
        );

        Self::refund_attached_deposit();

        let result = ClaimResult {
            claim_id: claim_id.clone(),
            status,
            measured_value,
            threshold,
            distance_to_kill,
            data_snapshot_hash,
            result_block: env::block_height(),
            result_timestamp: env::block_timestamp(),
        };
        env::log_str(&event_json(
            "result_stored",
            &near_sdk::serde_json::json!({
                "claim_id": result.claim_id,
                "status": result.status,
                "measured_value": result.measured_value,
                "threshold": result.threshold,
                "distance_to_kill": result.distance_to_kill,
                "data_snapshot_hash": result.data_snapshot_hash,
                "result_block": result.result_block,
                "result_timestamp": result.result_timestamp,
            }),
        ));
        self.claim_results.insert(&claim_id, &result);
        self.result_order.push(&claim_id);
    }

    /// The stored pre-registration commitment, if any.
    pub fn get_commit(&self) -> Option<ThesisCommit> {
        self.thesis_commitment.clone()
    }

    /// The attested result for one claim, if any.
    pub fn get_result(&self, claim_id: String) -> Option<ClaimResult> {
        self.claim_results.get(&claim_id)
    }

    /// All attested results in insertion order, capped at 500 entries.
    pub fn get_all_results(&self) -> Vec<ClaimResult> {
        let count = self.result_order.len().min(MAX_VIEW_LIMIT);
        (0..count)
            .filter_map(|i| {
                let id = self.result_order.get(i)?;
                self.claim_results.get(&id)
            })
            .collect()
    }

    /// The admin account allowed to write commitments and results.
    pub fn get_admin(&self) -> AccountId {
        self.admin.clone()
    }

    /// Claim ids in attestation order, capped at 500 entries.
    pub fn get_claim_ids(&self) -> Vec<String> {
        let count = self.result_order.len().min(MAX_VIEW_LIMIT);
        (0..count)
            .filter_map(|i| self.result_order.get(i))
            .collect()
    }

    /// Contract version string.
    pub fn version(&self) -> String {
        CONTRACT_VERSION.to_string()
    }

    // ----- internal helpers -----

    /// Every mutating method funnels through this check: only the admin
    /// account may write commitments or results.
    fn assert_admin(&self) {
        require!(
            env::predecessor_account_id() == self.admin,
            "Only the admin account can call this method"
        );
    }

    /// The contract never needs a deposit. If one was attached, send it
    /// straight back so callers cannot burn funds by mistake.
    fn refund_attached_deposit() {
        let attached = env::attached_deposit();
        if attached.as_yoctonear() > 0 {
            let _ = Promise::new(env::predecessor_account_id()).transfer(attached);
        }
    }
}

/// True iff `s` is exactly 64 lowercase hexadecimal characters.
fn is_sha256_hex(s: &str) -> bool {
    s.len() == 64 && s.bytes().all(|b| matches!(b, b'0'..=b'9' | b'a'..=b'f'))
}

/// Build a NEP-297 style event log line:
/// {"standard":"popper","version":"1.0.0","event":"<name>","data":[<data>]}
fn event_json(event: &str, data: &near_sdk::serde_json::Value) -> String {
    near_sdk::serde_json::json!({
        "standard": "popper",
        "version": CONTRACT_VERSION,
        "event": event,
        "data": [data],
    })
    .to_string()
}

#[cfg(test)]
mod tests;
