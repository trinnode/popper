//! Unit tests for the Popper contract.
//!
//! Tests use the near-sdk mock VM (`VMContextBuilder` + `testing_env!`) and
//! call contract methods directly on the returned instance. No network, no
//! external data.

use crate::{ClaimStatus, PopperContract, CONTRACT_VERSION};
use near_sdk::test_utils::{get_created_receipts, get_logs, VMContextBuilder};
use near_sdk::{testing_env, AccountId, Gas, NearToken};

const ADMIN: &str = "popper-admin.near";
const INTRUDER: &str = "not-the-admin.near";

/// 64 lowercase hex chars, a stand-in for a real sha256 digest.
const VALID_HASH: &str = "ab";
/// 64 chars but not hex.
const NOT_HEX: &str = "zz";
/// 63 chars, wrong length.
const WRONG_LEN: &str = "ab";

fn sha256_like() -> String {
    VALID_HASH.repeat(32)
}

fn not_hex_64() -> String {
    NOT_HEX.repeat(32)
}

fn wrong_len_63() -> String {
    WRONG_LEN.repeat(31) + "a"
}

fn admin_account() -> AccountId {
    ADMIN.parse().unwrap()
}

fn intruder_account() -> AccountId {
    INTRUDER.parse().unwrap()
}

/// Context where the admin is calling with zero attached deposit.
fn admin_context() -> VMContextBuilder {
    let mut ctx = VMContextBuilder::new();
    ctx.current_account_id(ADMIN.parse().unwrap())
        .signer_account_id(ADMIN.parse().unwrap())
        .predecessor_account_id(ADMIN.parse().unwrap())
        .attached_deposit(NearToken::from_yoctonear(0))
        .prepaid_gas(Gas::from_tgas(300));
    ctx
}

fn init_contract() -> PopperContract {
    testing_env!(admin_context().build());
    PopperContract::init(admin_account())
}

fn sample_result(claim_id: &str) -> (String, ClaimStatus, String, String, String, String) {
    (
        claim_id.to_string(),
        ClaimStatus::Holding,
        "27300000000".to_string(),
        ">= 24000000000".to_string(),
        "35%".to_string(),
        sha256_like(),
    )
}

// ---------------------------------------------------------------------------
// init
// ---------------------------------------------------------------------------

#[test]
fn init_sets_admin_and_empty_state() {
    let contract = init_contract();
    assert_eq!(contract.get_admin(), admin_account());
    assert!(contract.get_commit().is_none());
    assert!(contract.get_all_results().is_empty());
    assert!(contract.get_claim_ids().is_empty());
    assert_eq!(contract.version(), CONTRACT_VERSION);
}

#[test]
#[should_panic(expected = "Contract already initialized")]
fn double_init_panics() {
    // Simulate a contract that already has on-chain state: the SDK stores
    // contract state under the b"STATE" key, so writing it makes init see
    // an already deployed contract.
    testing_env!(admin_context().build());
    near_sdk::env::storage_write(b"STATE", b"existing state");
    PopperContract::init(admin_account());
}

#[test]
fn init_refunds_attached_deposit() {
    testing_env!(admin_context()
        .attached_deposit(NearToken::from_yoctonear(1))
        .build());
    PopperContract::init(admin_account());
    assert_eq!(get_created_receipts().len(), 1, "deposit must be refunded");
}

// ---------------------------------------------------------------------------
// store_commit
// ---------------------------------------------------------------------------

#[test]
fn store_commit_captures_block_height_and_timestamp() {
    let mut contract = init_contract();
    testing_env!(admin_context()
        .block_height(1234)
        .block_timestamp(1_700_000_000_000_000_000)
        .build());
    contract.store_commit(
        sha256_like(),
        Some("bafytest".to_string()),
        "xpreach".to_string(),
    );

    let commit = contract.get_commit().expect("commit must be stored");
    assert_eq!(commit.claims_hash, sha256_like());
    assert_eq!(commit.commit_block, 1234);
    assert_eq!(commit.commit_timestamp, 1_700_000_000_000_000_000);
    assert_eq!(commit.ipfs_cid, Some("bafytest".to_string()));
    assert_eq!(commit.author, "xpreach");
}

#[test]
fn store_commit_accepts_missing_ipfs_cid() {
    let mut contract = init_contract();
    contract.store_commit(sha256_like(), None, "xpreach".to_string());
    assert_eq!(contract.get_commit().unwrap().ipfs_cid, None);
}

#[test]
#[should_panic(expected = "Commitment already stored: the pre-registration is immutable")]
fn double_commit_panics() {
    let mut contract = init_contract();
    contract.store_commit(sha256_like(), None, "xpreach".to_string());
    contract.store_commit(sha256_like(), None, "xpreach".to_string());
}

#[test]
#[should_panic(expected = "Only the admin account can call this method")]
fn non_admin_commit_panics() {
    let mut contract = init_contract();
    testing_env!(admin_context()
        .predecessor_account_id(intruder_account())
        .signer_account_id(intruder_account())
        .build());
    contract.store_commit(sha256_like(), None, "xpreach".to_string());
}

#[test]
#[should_panic(expected = "claims_hash must be exactly 64 lowercase hex characters")]
fn commit_rejects_uppercase_hash() {
    let mut contract = init_contract();
    contract.store_commit(sha256_like().to_uppercase(), None, "xpreach".to_string());
}

#[test]
#[should_panic(expected = "claims_hash must be exactly 64 lowercase hex characters")]
fn commit_rejects_wrong_length_hash() {
    let mut contract = init_contract();
    contract.store_commit(wrong_len_63(), None, "xpreach".to_string());
}

#[test]
#[should_panic(expected = "claims_hash must be exactly 64 lowercase hex characters")]
fn commit_rejects_non_hex_hash() {
    let mut contract = init_contract();
    contract.store_commit(not_hex_64(), None, "xpreach".to_string());
}

#[test]
fn store_commit_refunds_attached_deposit() {
    let mut contract = init_contract();
    testing_env!(admin_context()
        .attached_deposit(NearToken::from_yoctonear(500))
        .build());
    contract.store_commit(sha256_like(), None, "xpreach".to_string());
    assert_eq!(get_created_receipts().len(), 1, "deposit must be refunded");
}

// ---------------------------------------------------------------------------
// store_result
// ---------------------------------------------------------------------------

#[test]
fn store_result_happy_path_captures_block_and_keeps_order() {
    let mut contract = init_contract();
    testing_env!(admin_context()
        .block_height(2000)
        .block_timestamp(42)
        .build());

    let (id, status, measured, threshold, distance, snapshot) = sample_result("claim_a");
    contract.store_result(id, status, measured, threshold, distance, snapshot);

    let stored = contract.get_result("claim_a".to_string()).unwrap();
    assert_eq!(stored.status, ClaimStatus::Holding);
    assert_eq!(stored.measured_value, "27300000000");
    assert_eq!(stored.threshold, ">= 24000000000");
    assert_eq!(stored.distance_to_kill, "35%");
    assert_eq!(stored.data_snapshot_hash, sha256_like());
    assert_eq!(stored.result_block, 2000);
    assert_eq!(stored.result_timestamp, 42);

    // A second claim keeps insertion order.
    let (id2, status2, measured2, threshold2, distance2, snapshot2) = sample_result("claim_b");
    contract.store_result(id2, status2, measured2, threshold2, distance2, snapshot2);

    let ids = contract.get_claim_ids();
    assert_eq!(ids, vec!["claim_a".to_string(), "claim_b".to_string()]);
    let all = contract.get_all_results();
    assert_eq!(all.len(), 2);
    assert_eq!(all[0].claim_id, "claim_a");
    assert_eq!(all[1].claim_id, "claim_b");
}

#[test]
#[should_panic(expected = "Result already attested for this claim: results are immutable")]
fn double_result_panics() {
    let mut contract = init_contract();
    let (id, status, measured, threshold, distance, snapshot) = sample_result("claim_a");
    contract.store_result(
        id.clone(),
        status,
        measured.clone(),
        threshold.clone(),
        distance.clone(),
        snapshot.clone(),
    );
    contract.store_result(id, status, measured, threshold, distance, snapshot);
}

#[test]
#[should_panic(expected = "Only the admin account can call this method")]
fn non_admin_result_panics() {
    let mut contract = init_contract();
    testing_env!(admin_context()
        .predecessor_account_id(intruder_account())
        .signer_account_id(intruder_account())
        .build());
    let (id, status, measured, threshold, distance, snapshot) = sample_result("claim_a");
    contract.store_result(id, status, measured, threshold, distance, snapshot);
}

#[test]
#[should_panic(expected = "data_snapshot_hash must be exactly 64 lowercase hex characters")]
fn result_rejects_invalid_snapshot_hash() {
    let mut contract = init_contract();
    contract.store_result(
        "claim_a".to_string(),
        ClaimStatus::Falsified,
        "1".to_string(),
        "2".to_string(),
        "3".to_string(),
        not_hex_64(),
    );
}

#[test]
#[should_panic(expected = "claim_id must not be empty")]
fn result_rejects_empty_claim_id() {
    let mut contract = init_contract();
    contract.store_result(
        String::new(),
        ClaimStatus::Pending,
        "1".to_string(),
        "2".to_string(),
        "3".to_string(),
        sha256_like(),
    );
}

#[test]
fn store_result_refunds_attached_deposit() {
    let mut contract = init_contract();
    testing_env!(admin_context()
        .attached_deposit(NearToken::from_yoctonear(10))
        .build());
    let (id, status, measured, threshold, distance, snapshot) = sample_result("claim_a");
    contract.store_result(id, status, measured, threshold, distance, snapshot);
    assert_eq!(get_created_receipts().len(), 1, "deposit must be refunded");
}

// ---------------------------------------------------------------------------
// views and events
// ---------------------------------------------------------------------------

#[test]
fn get_result_returns_none_for_unknown_claim() {
    let contract = init_contract();
    assert!(contract.get_result("nope".to_string()).is_none());
}

#[test]
fn all_claim_statuses_round_trip_through_views() {
    let mut contract = init_contract();
    for (i, status) in [
        ClaimStatus::Pending,
        ClaimStatus::Holding,
        ClaimStatus::AtRisk,
        ClaimStatus::Falsified,
    ]
    .into_iter()
    .enumerate()
    {
        contract.store_result(
            format!("claim_{i}"),
            status,
            "v".to_string(),
            "t".to_string(),
            "d".to_string(),
            sha256_like(),
        );
    }
    let all = contract.get_all_results();
    assert_eq!(all.len(), 4);
    assert_eq!(all[0].status, ClaimStatus::Pending);
    assert_eq!(all[1].status, ClaimStatus::Holding);
    assert_eq!(all[2].status, ClaimStatus::AtRisk);
    assert_eq!(all[3].status, ClaimStatus::Falsified);
}

#[test]
fn mutations_emit_nep297_events() {
    let mut contract = init_contract();

    contract.store_commit(sha256_like(), None, "xpreach".to_string());
    let (id, status, measured, threshold, distance, snapshot) = sample_result("claim_a");
    contract.store_result(id, status, measured, threshold, distance, snapshot);

    let logs = get_logs();
    assert_eq!(logs.len(), 2, "one event log per mutation");

    let commit_event: near_sdk::serde_json::Value =
        near_sdk::serde_json::from_str(&logs[0]).expect("commit event must be valid JSON");
    assert_eq!(commit_event["standard"], "popper");
    assert_eq!(commit_event["version"], CONTRACT_VERSION);
    assert_eq!(commit_event["event"], "commit_stored");
    assert_eq!(commit_event["data"][0]["claims_hash"], sha256_like());
    assert_eq!(commit_event["data"][0]["author"], "xpreach");

    let result_event: near_sdk::serde_json::Value =
        near_sdk::serde_json::from_str(&logs[1]).expect("result event must be valid JSON");
    assert_eq!(result_event["standard"], "popper");
    assert_eq!(result_event["event"], "result_stored");
    assert_eq!(result_event["data"][0]["claim_id"], "claim_a");
    assert_eq!(result_event["data"][0]["status"], "Holding");
    assert_eq!(result_event["data"][0]["data_snapshot_hash"], sha256_like());
}
