import { NextResponse } from "next/server";
import {
  claimsJsonHash,
  computeStatusFromResults,
  countStatuses,
  loadChainState,
  loadClaims,
  loadManifest,
  loadResults,
  verifySnapshotHashes,
  type VerifyStep,
} from "@/lib/popper";

export const dynamic = "force-dynamic";

/**
 * POST /api/verify
 * Offline verification, self-contained in the web package (no dependency on
 * packages/engine): reloads claims.json and every manifest-listed snapshot,
 * recomputes SHA-256 hashes, compares against the manifest, and reports the
 * attested statuses. The UI renders the returned steps as terminal lines.
 */
export async function POST() {
  const steps: VerifyStep[] = [];

  // Step 1: claims.json loads and hashes
  const hash = await claimsJsonHash();
  const claims = await loadClaims();
  steps.push({
    id: "claims",
    label: "load claims.json",
    status: claims ? "PASS" : "FAIL",
    detail: claims
      ? `sha256 ${hash ?? "unknown"} - ${claims.claims.length} claims, thesis v${claims.version ?? "?"}`
      : "claims.json not found at repo root",
  });

  // Step 2: manifest
  const manifest = await loadManifest();
  steps.push({
    id: "manifest",
    label: "load snapshots/manifest.json",
    status: manifest ? "PASS" : "SKIP",
    detail: manifest
      ? `${manifest.snapshots.length} snapshot${manifest.snapshots.length === 1 ? "" : "s"} listed`
      : "no manifest yet - snapshots have not been pulled (cold clone expected state)",
  });

  // Step 3: recompute snapshot hashes
  const integrities = await verifySnapshotHashes();
  if (integrities.length === 0) {
    steps.push({
      id: "snapshots",
      label: "recompute snapshot SHA-256",
      status: "SKIP",
      detail: "nothing to verify: manifest is empty or missing",
    });
  } else {
    const mismatches = integrities.filter((i) => !i.ok);
    steps.push({
      id: "snapshots",
      label: "recompute snapshot SHA-256",
      status: mismatches.length === 0 ? "PASS" : "FAIL",
      detail:
        mismatches.length === 0
          ? `${integrities.length}/${integrities.length} snapshots match pinned hashes`
          : `hash mismatch: ${mismatches.map((m) => m.file).join(", ")}`,
    });
  }

  // Step 4: on-chain commitment comparison
  const chain = await loadChainState();
  if (!chain.connected || !chain.commit) {
    steps.push({
      id: "commit",
      label: `compare claims hash to on-chain commit (${chain.contractId})`,
      status: "SKIP",
      detail: "on-chain data pending first commit - contract has no commitment yet",
    });
  } else if (hash && chain.commit.claims_hash === hash) {
    steps.push({
      id: "commit",
      label: `compare claims hash to on-chain commit (${chain.contractId})`,
      status: "PASS",
      detail: `claims.json hash matches commit at block ${chain.commit.commit_block}`,
    });
  } else {
    steps.push({
      id: "commit",
      label: `compare claims hash to on-chain commit (${chain.contractId})`,
      status: "FAIL",
      detail: "COMMIT_MISMATCH: local claims.json differs from the on-chain commitment",
    });
  }

  // Step 5: statuses from results.json
  const results = await loadResults();
  const items = claims?.claims ?? [];
  if (!results) {
    steps.push({
      id: "results",
      label: "load results/results.json",
      status: "SKIP",
      detail: "no attested results yet - all claims display as PENDING",
    });
  } else {
    steps.push({
      id: "results",
      label: "load results/results.json",
      status: "PASS",
      detail: `${results.results.length} attested claim result(s) loaded`,
    });
  }

  const counts = countStatuses(items, results);
  const statuses = items.map((c) => ({
    claim_id: c.id,
    status: computeStatusFromResults(c.id, results).status,
  }));

  const ok = !steps.some((s) => s.status === "FAIL");

  return NextResponse.json({
    ok,
    steps,
    counts,
    statuses,
    integrity: ok ? "INTEGRITY_OK" : "INTEGRITY_ERROR",
    ran_at: new Date().toISOString(),
  });
}
