"use client";

import { useState } from "react";
import type { Claim, ClaimResultEntry, ClaimStatus } from "@/lib/popper";
import type { MetricPoint } from "./MetricChart";
import { MetricChart } from "./MetricChart";
import { MarginBar } from "./MarginBar";
import { StatusBadge } from "./StatusDot";
import { VerifyTerminal } from "./VerifyTerminal";
import { formatMetric, claimThresholdText } from "@/lib/metric";
import { killThreshold, truncateHash } from "@/lib/format";

const SNAPSHOTS_DIR = "https://github.com/trinnode/popper-near/tree/main/snapshots";

export interface ClaimCardProps {
  claim: Claim;
  status: ClaimStatus;
  entry: ClaimResultEntry | null;
  history: MetricPoint[];
}

export function ClaimCard({ claim, status, entry, history }: ClaimCardProps) {
  const [open, setOpen] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const measuredRaw = entry?.measured_value ?? null;
  const measuredNum = typeof measuredRaw === "string" ? Number(measuredRaw) : measuredRaw;
  const measured: number | null =
    measuredNum != null && Number.isFinite(measuredNum) ? measuredNum : null;

  const kt = killThreshold(claim);

  return (
    <article className="border border-line bg-panel">
      <div className="flex flex-col gap-3 px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <StatusBadge status={status} />
          {claim.measurement_window?.end ? (
            <span className="mono text-[11px] text-faint">
              window: {claim.measurement_window.start ?? "?"} - {claim.measurement_window.end}
            </span>
          ) : null}
        </div>

        <h3 className="text-lg font-semibold leading-snug text-white sm:text-xl">{claim.title}</h3>

        <dl className="grid grid-cols-1 gap-x-8 gap-y-2 text-sm md:grid-cols-[110px_1fr]">
          <dt className="micro-label pt-0.5">Required</dt>
          <dd className="mono text-white">{claimThresholdText(claim)}</dd>

          <dt className="micro-label pt-0.5">Measured</dt>
          <dd className="mono text-white">
            {formatMetric(claim.metric, measuredRaw)}
            {entry?.distance_to_kill ? (
              <span className="ml-2 text-xs text-muted">({entry.distance_to_kill})</span>
            ) : null}
            {status === "PENDING" && !entry ? (
              <span className="ml-2 text-xs text-faint">(awaiting attestation)</span>
            ) : null}
          </dd>

          <dt className="micro-label pt-0.5">Kill zone</dt>
          <dd className="mono text-fail">{claim.kill_condition ?? "see claims.json"}</dd>
        </dl>

        <MarginBar
          measured={measured}
          required={thresholdNumber(claim)}
          risk={kt.risk}
          kill={kt.value}
          direction={kt.direction}
        />

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
          <p className="text-xs text-muted">
            <span className="micro-label mr-2">Data</span>
            <span className="mono">{claim.source}</span>
            {entry?.snapshot_hash ? (
              <span className="mono ml-2 text-faint">
                snapshot {truncateHash(entry.snapshot_hash, 6, 4)}
              </span>
            ) : null}
          </p>
          <div className="flex items-center gap-2">
            {entry?.snapshot_hash ? (
              <a
                href={SNAPSHOTS_DIR}
                target="_blank"
                rel="noopener noreferrer"
                className="mono border border-line px-2 py-1 text-[11px] text-muted hover:border-accent hover:text-accent"
              >
                ↗ View data
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => setVerifying(true)}
              className="mono cursor-pointer border border-accent/50 bg-accent/10 px-3 py-1 text-[11px] tracking-wider text-accent transition-colors hover:bg-accent/20"
            >
              VERIFY NOW
            </button>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="mono cursor-pointer border border-line px-2 py-1 text-[11px] text-muted hover:border-line-strong hover:text-white"
            >
              {open ? "HIDE ▲" : "DETAIL ▼"}
            </button>
          </div>
        </div>
      </div>

      {open ? (
        <div className="border-t border-line bg-panel-2/50 px-4 py-5 sm:px-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <h4 className="micro-label mb-2">Metric definition</h4>
              <p className="text-sm leading-relaxed text-muted">
                {claim.metric_definition ?? "See claims.json for the full definition."}
              </p>
              <h4 className="micro-label mb-2 mt-5">Measurement window</h4>
              <p className="mono text-sm text-white">
                {claim.measurement_window?.start ?? "?"} - {claim.measurement_window?.end ?? "?"}
                {claim.measurement_window?.measure_at
                  ? ` (measured at ${claim.measurement_window.measure_at})`
                  : ""}
              </p>
              {claim.baseline ? (
                <>
                  <h4 className="micro-label mb-2 mt-5">Baseline</h4>
                  <p className="mono text-sm text-white">
                    {formatMetric(claim.metric, claim.baseline.value)}
                    <span className="ml-2 text-xs text-faint">
                      {claim.baseline.date} - {claim.baseline.detail ?? ""}
                    </span>
                  </p>
                </>
              ) : null}
              {claim.note ? (
                <>
                  <h4 className="micro-label mb-2 mt-5">Note</h4>
                  <p className="text-sm leading-relaxed text-risk/90">{claim.note}</p>
                </>
              ) : null}
              <h4 className="micro-label mb-2 mt-5">Attestation</h4>
              <p className="text-sm text-muted">
                {status === "PENDING" ? (
                  "Result attestation transaction pending. It will appear here once the measurement window closes and the engine attests on-chain."
                ) : (
                  <a
                    href="https://explorer.near.org/accounts/popper.trinnode.near"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mono text-accent hover:underline"
                  >
                    ↗ NEAR attestation tx (explorer)
                  </a>
                )}
              </p>
              <h4 className="micro-label mb-2 mt-5">Source URL</h4>
              {claim.source_url ? (
                <a
                  href={claim.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mono break-all text-xs text-accent hover:underline"
                >
                  {claim.source_url}
                </a>
              ) : (
                <p className="mono text-xs text-faint">{claim.source}</p>
              )}
            </div>
            <div>
              <h4 className="micro-label mb-2">Metric over snapshot history</h4>
              {history.length > 0 ? (
                <MetricChart data={history} />
              ) : (
                <div className="flex h-52 items-center justify-center border border-dashed border-line px-6 text-center">
                  <p className="text-xs leading-relaxed text-faint">
                    No snapshot history yet. Nightly snapshots land in{" "}
                    <span className="mono">snapshots/</span> and this chart fills in automatically
                    once the manifest lists them.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {verifying ? <VerifyTerminal onClose={() => setVerifying(false)} /> : null}
    </article>
  );
}

function thresholdNumber(claim: Claim): number | null {
  const t = claim.threshold;
  if (typeof t.min_pct === "number") return t.min_pct;
  if (typeof t.min === "number") return t.min;
  if (typeof t.max_ratio === "number") return t.max_ratio;
  return null;
}
