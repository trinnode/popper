import { createHash } from "node:crypto";

export type ClaimStatus = "PENDING" | "HOLDING" | "AT_RISK" | "FALSIFIED";
export interface Claim { id: string; threshold: Record<string, unknown>; kill_condition?: string; }
export interface EvaluationResult { claimId: string; status: ClaimStatus; measuredValue: number; threshold: string; distanceToKill: string; dataSnapshotHash: string; evaluatedAt: string; }

export function sha256(value: string | Buffer): string { return createHash("sha256").update(value).digest("hex"); }

export function evaluateClaim(claim: Claim, measuredValue: number, snapshot: string, now = new Date()): EvaluationResult {
  const threshold = claim.threshold;
  const min = typeof threshold.min === "number" ? threshold.min : typeof threshold.min_pct === "number" ? threshold.min_pct : undefined;
  const max = typeof threshold.max_ratio === "number" ? threshold.max_ratio : undefined;
  if (min === undefined && max === undefined) throw new Error(`Claim ${claim.id} has no supported numeric threshold`);
  let status: ClaimStatus;
  let distance: number;
  if (min !== undefined) {
    const kill = min * 0.6;
    distance = measuredValue - kill;
    status = measuredValue < kill ? "FALSIFIED" : measuredValue < min ? "AT_RISK" : "HOLDING";
  } else {
    const kill = max! * 2;
    distance = kill - measuredValue;
    status = measuredValue >= kill ? "FALSIFIED" : measuredValue > max! ? "AT_RISK" : "HOLDING";
  }
  return {
    claimId: claim.id,
    status,
    measuredValue,
    threshold: min !== undefined ? `>= ${min}` : `<= ${max}`,
    distanceToKill: `${distance >= 0 ? "+" : ""}${distance}`,
    dataSnapshotHash: sha256(snapshot),
    evaluatedAt: now.toISOString(),
  };
}

export function countStatuses(results: EvaluationResult[]): Record<ClaimStatus, number> {
  return results.reduce((counts, result) => ({ ...counts, [result.status]: counts[result.status] + 1 }), { PENDING: 0, HOLDING: 0, AT_RISK: 0, FALSIFIED: 0 });
}
