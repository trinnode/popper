/**
 * Popper data layer for the web frontend.
 *
 * Self-contained and read-only on purpose: it must never depend on
 * packages/engine or packages/cli (they build in parallel and may not exist).
 * Every filesystem and network read is wrapped so a cold clone with zero
 * snapshots and no contract deployed still renders every page.
 */

import { createHash } from "node:crypto";
import { promises as fs, statSync } from "node:fs";
import path from "node:path";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export type ClaimStatus = "PENDING" | "HOLDING" | "AT_RISK" | "FALSIFIED";

export interface ClaimThreshold {
  min?: number;
  min_pct?: number;
  max_ratio?: number;
  [key: string]: unknown;
}

export interface Claim {
  id: string;
  title: string;
  metric: string;
  metric_definition?: string;
  source: string;
  source_url?: string;
  baseline?: {
    date?: string;
    value?: number | string;
    detail?: string;
  };
  threshold: ClaimThreshold;
  kill_condition?: string;
  at_risk_zone?: string;
  measurement_window?: {
    start?: string;
    end?: string;
    measure_at?: string;
  };
  status?: ClaimStatus;
  note?: string;
}

export interface ClaimsFile {
  thesis?: string;
  author?: string;
  version?: string;
  commit_deadline?: string;
  measurement_note?: string;
  claims: Claim[];
}

export interface ManifestSnapshot {
  file: string;
  sha256?: string;
  date?: string;
  pulled_at?: string;
  sources?: number | string[] | unknown;
  bytes?: number;
  [key: string]: unknown;
}

export interface ManifestFile {
  generated_at?: string;
  snapshots: ManifestSnapshot[];
}

export interface ClaimResultEntry {
  claim_id: string;
  status?: string;
  measured_value?: number | string;
  threshold?: string;
  snapshot_hash?: string;
  evaluated_at?: string;
  distance_to_kill?: string;
  [key: string]: unknown;
}

export interface ResultsFile {
  generated_at?: string;
  results_hash?: string;
  block_height?: number | string;
  tx_hash?: string;
  results: ClaimResultEntry[];
}

export interface ChainCommit {
  claims_hash: string;
  commit_block: number | string;
  commit_timestamp: number | string;
  ipfs_cid?: string | null;
}

export interface ChainClaimResult {
  claim_id: string;
  status?: string;
  measured_value?: string;
  data_snapshot_hash?: string;
  result_block?: number | string;
  result_timestamp?: number | string;
}

export interface ChainState {
  connected: boolean;
  contractId: string;
  commit: ChainCommit | null;
  results: Record<string, ChainClaimResult> | null;
  error?: string;
}

export interface VerifyStep {
  id: string;
  label: string;
  status: "PASS" | "FAIL" | "SKIP" | "WARN";
  detail: string;
}

/* ------------------------------------------------------------------ */
/* Repo root discovery (works from `next dev` and `next build`)        */
/* ------------------------------------------------------------------ */

let repoRootCache: string | null = null;

export function repoRoot(): string {
  if (repoRootCache) return repoRootCache;
  let dir = process.cwd();
  for (let i = 0; i < 6; i += 1) {
    // Repo root is the directory that owns claims.json and snapshots/
    if (i > 0) dir = path.dirname(dir);
    try {
      const stat = statSync(path.join(dir, "claims.json"));
      if (stat.isFile()) {
        repoRootCache = dir;
        return dir;
      }
    } catch {
      // keep walking up
    }
  }
  // Fallback: assume the standard layout <root>/packages/web
  repoRootCache = path.resolve(process.cwd(), "..", "..");
  return repoRootCache;
}

/* ------------------------------------------------------------------ */
/* Hashing                                                            */
/* ------------------------------------------------------------------ */

export function sha256Buffer(buf: Buffer | string): string {
  return createHash("sha256").update(buf).digest("hex");
}

export async function sha256File(filePath: string): Promise<string | null> {
  try {
    const buf = await fs.readFile(filePath);
    return sha256Buffer(buf);
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* loaders: claims.json, snapshots/manifest.json, results/results.json */
/* ------------------------------------------------------------------ */

export async function loadClaims(): Promise<ClaimsFile | null> {
  try {
    const raw = await fs.readFile(path.join(repoRoot(), "claims.json"), "utf8");
    const parsed = JSON.parse(raw) as Partial<ClaimsFile>;
    if (!parsed || !Array.isArray(parsed.claims)) return null;
    return {
      thesis: typeof parsed.thesis === "string" ? parsed.thesis : undefined,
      author: typeof parsed.author === "string" ? parsed.author : undefined,
      version: typeof parsed.version === "string" ? parsed.version : undefined,
      commit_deadline:
        typeof parsed.commit_deadline === "string" ? parsed.commit_deadline : undefined,
      measurement_note:
        typeof parsed.measurement_note === "string" ? parsed.measurement_note : undefined,
      claims: parsed.claims.filter((c): c is Claim => Boolean(c && typeof c.id === "string")),
    };
  } catch {
    return null;
  }
}

function coerceManifest(raw: unknown): ManifestFile | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  let list: unknown[] = [];
  if (Array.isArray(obj.snapshots)) {
    list = obj.snapshots;
  } else if (Array.isArray(raw)) {
    list = raw as unknown[];
  } else {
    return null;
  }
  const snapshots: ManifestSnapshot[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const s = item as Record<string, unknown>;
    const file = typeof s.file === "string" ? s.file : typeof s.filename === "string" ? (s.filename as string) : null;
    if (!file) continue;
    snapshots.push({
      ...s,
      file,
      sha256: typeof s.sha256 === "string" ? s.sha256 : undefined,
      date: typeof s.date === "string" ? s.date : undefined,
      pulled_at: typeof s.pulled_at === "string" ? s.pulled_at : undefined,
    });
  }
  return {
    generated_at: typeof obj.generated_at === "string" ? obj.generated_at : undefined,
    snapshots,
  };
}

export async function loadManifest(): Promise<ManifestFile | null> {
  try {
    const raw = await fs.readFile(
      path.join(repoRoot(), "snapshots", "manifest.json"),
      "utf8",
    );
    return coerceManifest(JSON.parse(raw));
  } catch {
    return null;
  }
}

function coerceResults(raw: unknown): ResultsFile | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const list = Array.isArray(obj.results)
    ? obj.results
    : Array.isArray(raw)
      ? (raw as unknown[])
      : null;
  if (!list) return null;
  const results: ClaimResultEntry[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const id =
      typeof r.claim_id === "string"
        ? r.claim_id
        : typeof r.id === "string"
          ? r.id
          : null;
    if (!id) continue;
    results.push({
      claim_id: id,
      status: typeof r.status === "string" ? r.status : undefined,
      measured_value:
        typeof r.measured_value === "number" || typeof r.measured_value === "string"
          ? r.measured_value
          : undefined,
      snapshot_hash: typeof r.snapshot_hash === "string" ? r.snapshot_hash : undefined,
      evaluated_at: typeof r.evaluated_at === "string" ? r.evaluated_at : undefined,
      distance_to_kill:
        typeof r.distance_to_kill === "string" ? r.distance_to_kill : undefined,
    });
  }
  return {
    generated_at: typeof obj.generated_at === "string" ? obj.generated_at : undefined,
    results_hash: typeof obj.results_hash === "string" ? obj.results_hash : undefined,
    block_height:
      typeof obj.block_height === "number" || typeof obj.block_height === "string"
        ? obj.block_height
        : undefined,
    tx_hash: typeof obj.tx_hash === "string" ? obj.tx_hash : undefined,
    results,
  };
}

export async function loadResults(): Promise<ResultsFile | null> {
  try {
    const raw = await fs.readFile(
      path.join(repoRoot(), "results", "results.json"),
      "utf8",
    );
    return coerceResults(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Pure display logic: attested status from results.json, else PENDING. */
export function computeStatusFromResults(
  claimId: string,
  results: ResultsFile | null,
): { status: ClaimStatus; entry: ClaimResultEntry | null } {
  const entry = results?.results.find((r) => r.claim_id === claimId) ?? null;
  const raw = (entry?.status ?? "").toUpperCase();
  if (raw === "HOLDING" || raw === "AT_RISK" || raw === "FALSIFIED" || raw === "PENDING") {
    return { status: raw, entry };
  }
  return { status: "PENDING", entry };
}

/* ------------------------------------------------------------------ */
/* NEAR RPC view calls (silent fallback, never throws)                 */
/* ------------------------------------------------------------------ */

const DEFAULT_RPC = "https://rpc.mainnet.near.org";
const FALLBACK_RPCS = ["https://rpc.fastnear.com", "https://rpc.mainnet.fastnear.com"];

export function contractId(): string {
  return process.env.NEXT_PUBLIC_POPPER_CONTRACT_ID || "popper.trinnode.near";
}

function rpcUrls(): string[] {
  const primary = process.env.NEXT_PUBLIC_NEAR_RPC_URL || DEFAULT_RPC;
  return [primary, ...FALLBACK_RPCS.filter((u) => u !== primary)];
}

async function postRpc(url: string, body: unknown): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(4000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as unknown;
  } catch {
    return null;
  }
}

interface RpcOk {
  result?: unknown;
  error?: unknown;
}

/** Query a view function. Returns null on any failure (contract missing etc). */
export async function chainView<T>(methodName: string, args: Record<string, unknown> = {}): Promise<T | null> {
  const argsBase64 = Buffer.from(JSON.stringify(args)).toString("base64");
  for (const url of rpcUrls()) {
    const json = (await postRpc(url, {
      jsonrpc: "2.0",
      id: "popper-web",
      method: "query",
      params: {
        request_type: "call_function",
        account_id: contractId(),
        method_name: methodName,
        args_base64: argsBase64,
        finality: "final",
      },
    })) as RpcOk | null;
    if (!json || json.error || !json.result) continue;
    const inner = json.result as { result?: number[] };
    if (!Array.isArray(inner.result)) continue;
    try {
      const text = Buffer.from(inner.result).toString("utf8");
      if (!text || text === "null") return null;
      return JSON.parse(text) as T;
    } catch {
      continue;
    }
  }
  return null;
}

export async function loadChainState(): Promise<ChainState> {
  const id = contractId();
  const commit = await chainView<ChainCommit>("get_commit");
  if (!commit) {
    // Contract not deployed yet (expected on a cold clone): fall back silently.
    return { connected: false, contractId: id, commit: null, results: null };
  }
  const rawResults = await chainView<[string, ChainClaimResult][]>("get_all_results");
  const map: Record<string, ChainClaimResult> = {};
  if (Array.isArray(rawResults)) {
    for (const pair of rawResults) {
      if (Array.isArray(pair) && typeof pair[0] === "string") {
        map[pair[0]] = pair[1];
      }
    }
  }
  return { connected: true, contractId: id, commit, results: map };
}

/* ------------------------------------------------------------------ */
/* Verification (offline, self-contained mirror of the engine check)   */
/* ------------------------------------------------------------------ */

export async function claimsJsonHash(): Promise<string | null> {
  try {
    const raw = await fs.readFile(path.join(repoRoot(), "claims.json"));
    return sha256Buffer(raw);
  } catch {
    return null;
  }
}

export interface SnapshotIntegrity {
  file: string;
  expected: string | null;
  actual: string | null;
  ok: boolean;
}

export async function verifySnapshotHashes(): Promise<SnapshotIntegrity[]> {
  const manifest = await loadManifest();
  if (!manifest) return [];
  const out: SnapshotIntegrity[] = [];
  for (const snap of manifest.snapshots) {
    const actual = await sha256File(path.join(repoRoot(), "snapshots", snap.file));
    out.push({
      file: snap.file,
      expected: snap.sha256 ?? null,
      actual,
      ok: Boolean(actual && snap.sha256 && actual === snap.sha256),
    });
  }
  return out;
}

/** Rebuild metric history for a claim from manifest-listed snapshot files. */
export async function loadMetricHistory(
  claim: Claim,
): Promise<{ date: string; value: number }[]> {
  const manifest = await loadManifest();
  if (!manifest) return [];
  const metric = claim.metric;
  const points: { date: string; value: number }[] = [];
  for (const snap of manifest.snapshots) {
    try {
      const raw = await fs.readFile(path.join(repoRoot(), "snapshots", snap.file), "utf8");
      const parsed: unknown = JSON.parse(raw);
      const value = extractMetric(parsed, metric);
      const date = snap.date ?? snap.pulled_at ?? snap.file;
      if (typeof value === "number" && Number.isFinite(value)) {
        points.push({ date, value });
      }
    } catch {
      // unreadable or non-JSON snapshot: skip
    }
  }
  return points;
}

function extractMetric(node: unknown, metric: string, depth = 0): number | null {
  if (depth > 4 || node == null) return null;
  if (typeof node === "number") return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = extractMetric(item, metric, depth + 1);
      if (found != null) return found;
    }
    return null;
  }
  if (typeof node === "object") {
    const obj = node as Record<string, unknown>;
    if (metric in obj) {
      const v = obj[metric];
      if (typeof v === "number") return v;
      if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) {
        return Number(v);
      }
    }
    for (const key of Object.keys(obj)) {
      const found = extractMetric(obj[key], metric, depth + 1);
      if (found != null) return found;
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Shared page state                                                  */
/* ------------------------------------------------------------------ */

export interface PopperState {
  claims: ClaimsFile | null;
  manifest: ManifestFile | null;
  results: ResultsFile | null;
  chain: ChainState;
  claimsHash: string | null;
}

export async function loadPopperState(): Promise<PopperState> {
  const [claims, manifest, results, chain, claimsHash] = await Promise.all([
    loadClaims(),
    loadManifest(),
    loadResults(),
    loadChainState(),
    claimsJsonHash(),
  ]);
  return { claims, manifest, results, chain, claimsHash };
}

export const STATUS_ORDER: Record<ClaimStatus, number> = {
  FALSIFIED: 0,
  AT_RISK: 1,
  HOLDING: 2,
  PENDING: 3,
};

export function sortClaimsBySeverity(claims: Claim[], results: ResultsFile | null): Claim[] {
  return [...claims].sort((a, b) => {
    const sa = STATUS_ORDER[computeStatusFromResults(a.id, results).status];
    const sb = STATUS_ORDER[computeStatusFromResults(b.id, results).status];
    return sa - sb;
  });
}

export function countStatuses(
  claims: Claim[],
  results: ResultsFile | null,
): Record<ClaimStatus, number> {
  const counts: Record<ClaimStatus, number> = {
    HOLDING: 0,
    AT_RISK: 0,
    PENDING: 0,
    FALSIFIED: 0,
  };
  for (const c of claims) {
    counts[computeStatusFromResults(c.id, results).status] += 1;
  }
  return counts;
}
