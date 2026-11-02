/** Formatting helpers shared across pages. Plain hyphens only, never em dashes. */

export function truncateHash(hash: string | null | undefined, head = 10, tail = 6): string {
  if (!hash) return "pending";
  if (hash.length <= head + tail + 1) return hash;
  return `${hash.slice(0, head)}...${hash.slice(-tail)}`;
}

export function formatBlock(block: number | string | null | undefined): string {
  if (block == null) return "pending";
  const n = typeof block === "string" ? Number(block) : block;
  if (!Number.isFinite(n)) return String(block);
  return `#${n.toLocaleString("en-US")}`;
}

export function formatTimestamp(
  ts: number | string | null | undefined,
): string {
  if (ts == null) return "pending";
  let ms: number;
  if (typeof ts === "number") {
    // NEAR timestamps are nanoseconds
    ms = ts > 1e15 ? Math.floor(ts / 1e6) : ts;
  } else {
    const parsed = Date.parse(ts);
    if (Number.isNaN(parsed)) return ts;
    ms = parsed;
  }
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return String(ts);
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });
}

export function formatUsd(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (n == null || !Number.isFinite(n)) return value != null ? String(value) : "pending";
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

export function formatPct(value: number | string | null | undefined, digits = 2): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (n == null || !Number.isFinite(n)) return value != null ? String(value) : "pending";
  return `${n.toFixed(digits)}%`;
}

export function formatNumber(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (n == null || !Number.isFinite(n)) return value != null ? String(value) : "pending";
  return n.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

/** Human label for a threshold object, e.g. { min_pct: 55 } -> ">= 55%" */
export function thresholdLabel(threshold: Record<string, unknown> | undefined): string {
  if (!threshold) return "pending";
  if (typeof threshold.min_pct === "number") return `>= ${threshold.min_pct}%`;
  if (typeof threshold.min === "number") {
    return threshold.min >= 1000 ? `>= ${formatUsd(threshold.min)}` : `>= ${formatNumber(threshold.min)}`;
  }
  if (typeof threshold.max_ratio === "number") return `<= ${threshold.max_ratio}`;
  const keys = Object.keys(threshold).filter((k) => k !== "$schema");
  if (keys.length === 0) return "pending";
  return `${keys[0]}: ${String(threshold[keys[0]])}`;
}

/** Extract the kill threshold number for the margin bar, plus direction. */
export function killThreshold(claim: {
  threshold?: Record<string, unknown>;
  kill_condition?: string;
  at_risk_zone?: string;
}): { value: number | null; risk: number | null; direction: "min" | "max" } {
  const t = claim.threshold ?? {};
  const direction: "min" | "max" = typeof t.max_ratio === "number" ? "max" : "min";
  const required = typeof t.min_pct === "number" ? t.min_pct : typeof t.min === "number" ? t.min : typeof t.max_ratio === "number" ? t.max_ratio : null;

  // Pull numbers out of the kill_condition and at_risk_zone text.
  const nums = (text?: string): number[] => {
    if (!text) return [];
    const matches = text.match(/(?:\$)?\d[\d,]*\.?\d*(?:%|M|B|K)?/g) ?? [];
    const out: number[] = [];
    for (const m of matches) {
      let n = Number(m.replace(/[$,%]/g, ""));
      if (!Number.isFinite(n)) continue;
      if (m.endsWith("B")) n *= 1e9;
      else if (m.endsWith("M")) n *= 1e6;
      else if (m.endsWith("K")) n *= 1e3;
      out.push(n);
    }
    return out;
  };

  let risk: number | null = null;
  let kill: number | null = null;
  if (required != null) {
    const riskNums = nums(claim.at_risk_zone);
    const killNums = nums(claim.kill_condition);
    if (direction === "min") {
      risk = riskNums.length ? Math.max(...riskNums) : required * 0.8;
      kill = killNums.length ? Math.max(...killNums) : required * 0.6;
    } else {
      risk = riskNums.length ? Math.min(...riskNums) : required * 0.7;
      kill = killNums.length ? Math.min(...killNums) : required;
    }
  }
  return { value: kill, risk, direction };
}
