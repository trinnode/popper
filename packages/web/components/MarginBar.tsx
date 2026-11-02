"use client";

/**
 * Pure CSS margin bar: kill threshold on one end, required threshold on the
 * other, measured value as a marker. No chart library.
 */
export function MarginBar({
  measured,
  required,
  risk,
  kill,
  direction,
}: {
  measured: number | null;
  required: number | null;
  risk: number | null;
  kill: number | null;
  direction: "min" | "max";
}) {
  if (required == null || kill == null) {
    return (
      <div className="mt-4">
        <div className="h-2 w-full border border-line bg-panel-2" />
        <p className="micro-label mt-1.5">margin vs kill threshold: pending measurement</p>
      </div>
    );
  }

  const hasRisk = risk != null && direction === "min" ? risk > kill : risk != null;
  const low = direction === "min" ? kill : required;
  const high = direction === "min" ? required : kill;
  const span = high - low || Math.abs(high) * 0.2 || 1;
  const pad = span * 0.15;

  const toPct = (v: number) => {
    const p = ((v - low) / (high - low)) * 100;
    return Math.max(-4, Math.min(104, p));
  };

  const killPct = toPct(kill);
  const riskPct = hasRisk && risk != null ? toPct(risk) : null;
  const reqPct = toPct(required);
  const measuredPct = measured != null ? toPct(measured) : null;

  const safeStart = direction === "min" ? (hasRisk && risk != null ? riskPct! : killPct) : 0;
  const safeEnd = direction === "min" ? 100 : hasRisk && risk != null ? riskPct! : killPct;

  return (
    <div className="mt-4" aria-hidden>
      <div className="relative h-2.5 w-full bg-panel-2">
        {/* kill zone (danger side) */}
        <div
          className="absolute inset-y-0 bg-fail/40"
          style={
            direction === "min"
              ? { left: 0, width: `${Math.max(killPct, 0)}%` }
              : { left: `${Math.max(killPct, 0)}%`, right: 0 }
          }
        />
        {/* at-risk band */}
        {riskPct != null ? (
          <div
            className="absolute inset-y-0 bg-risk/40"
            style={
              direction === "min"
                ? { left: `${Math.max(killPct, 0)}%`, width: `${Math.max(riskPct - killPct, 0)}%` }
                : { left: `${Math.max(riskPct, 0)}%`, width: `${Math.max(killPct - riskPct, 0)}%` }
            }
          />
        ) : null}
        {/* safe band */}
        <div
          className="absolute inset-y-0 bg-accent/30"
          style={
            direction === "min"
              ? { left: `${Math.max(safeStart, 0)}%`, width: `${Math.max(100 - safeStart, 0)}%` }
              : { left: 0, width: `${Math.max(safeEnd, 0)}%` }
          }
        />
        {/* measured marker */}
        {measuredPct != null ? (
          <div
            className="absolute inset-y-[-4px] w-[2px] bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
            style={{ left: `${measuredPct}%` }}
          />
        ) : null}
      </div>
      <div className="relative mt-1.5 h-4 text-[10px] leading-4">
        <span
          className="mono absolute -translate-x-1/2 whitespace-nowrap text-fail"
          style={{ left: `${Math.max(Math.min(killPct, 96), 4)}%` }}
        >
          kill {formatShort(kill)}
        </span>
        {riskPct != null ? (
          <span
            className="mono absolute -translate-x-1/2 whitespace-nowrap text-risk"
            style={{ left: `${Math.max(Math.min(riskPct, 98), 6)}%`, top: 0 }}
          >
            risk {formatShort(risk!)}
          </span>
        ) : null}
        <span
          className="mono absolute -translate-x-1/2 whitespace-nowrap text-accent"
          style={{ left: `${Math.max(Math.min(reqPct, 94), 2)}%` }}
        >
          req {formatShort(required)}
        </span>
      </div>
      <p className="micro-label mt-1">
        {measured != null
          ? `measured: ${formatShort(measured)} - marker on bar`
          : "measured: pending measurement"}
      </p>
    </div>
  );
}

function formatShort(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  if (abs < 1) return v.toFixed(3);
  return v.toFixed(1);
}
