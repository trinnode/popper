import type { Claim } from "@/lib/popper";
import { formatNumber, formatPct, formatUsd } from "@/lib/format";

/** Format a measured metric value based on the metric name. */
export function formatMetric(metric: string, value: number | string | null | undefined): string {
  if (value == null) return "pending";
  if (typeof value === "string" && Number.isNaN(Number(value))) return value;
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return String(value);
  const m = metric.toLowerCase();
  if (m.includes("pct") || m.includes("share") || m.includes("rate")) return formatPct(n);
  if (m.includes("usd") || m.includes("tvl") || m.includes("volume") || m.includes("fee")) {
    return formatUsd(n);
  }
  return formatNumber(n);
}

export function claimThresholdText(claim: Claim): string {
  const t = claim.threshold;
  if (!t) return "pending";
  if (typeof t.min_pct === "number") return `>= ${t.min_pct}%`;
  if (typeof t.min === "number") return `>= ${formatMetric(claim.metric, t.min)}`;
  if (typeof t.max_ratio === "number") return `<= ${t.max_ratio}`;
  return "see claims.json";
}
