import type { Metadata } from "next";
import Link from "next/link";
import { ClaimCard } from "@/components/ClaimCard";
import { VerifyNowButton } from "@/components/VerifyNowButton";
import {
  computeStatusFromResults,
  countStatuses,
  loadMetricHistory,
  loadPopperState,
  sortClaimsBySeverity,
} from "@/lib/popper";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Scoreboard - Popper",
  description: "Live status of every pre-registered claim: HOLDING, AT RISK, PENDING or FALSIFIED.",
};

export default async function ScoreboardPage() {
  const state = await loadPopperState();
  const claims = state.claims?.claims ?? [];
  const results = state.results;
  const counts = countStatuses(claims, results);
  const sorted = sortClaimsBySeverity(claims, results);

  const cards = await Promise.all(
    sorted.map(async (claim) => ({
      claim,
      history: await loadMetricHistory(claim),
      ...computeStatusFromResults(claim.id, results),
    })),
  );

  const lastVerified = results?.generated_at ?? null;

  return (
    <div className="pt-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Claim Scoreboard
          </h1>
          <p className="mt-2 text-sm text-muted">
            Every claim from the pre-registered thesis, sorted by severity. Statuses come from the
            attested results file; unattested claims read PENDING.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="mono text-[11px] text-faint">
            last verified:{" "}
            {lastVerified ? new Date(lastVerified).toLocaleString("en-US", { timeZone: "UTC" }) : "never"}
          </span>
          <VerifyNowButton />
        </div>
      </div>

      {/* summary line */}
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border border-line bg-panel px-4 py-3 sm:px-6">
        <span className="micro-label text-white">Overall</span>
        <span className="mono text-sm text-accent">{counts.HOLDING} HOLDING</span>
        <span className="text-faint">·</span>
        <span className="mono text-sm text-risk">{counts.AT_RISK} AT RISK</span>
        <span className="text-faint">·</span>
        <span className="mono text-sm text-muted">{counts.PENDING} PENDING</span>
        <span className="text-faint">·</span>
        <span className="mono text-sm text-fail">{counts.FALSIFIED} FALSIFIED</span>
      </div>

      {!state.chain.connected ? (
        <p className="mt-4 border border-line bg-panel-2/60 px-4 py-2.5 text-xs text-faint">
          On-chain data pending first commit: contract {state.chain.contractId} has no commitment
          yet, so the board is rendering from local files (claims.json + snapshots/ + results/).
        </p>
      ) : null}

      <div className="mt-6 space-y-4">
        {cards.length === 0 ? (
          <div className="border border-dashed border-line px-6 py-16 text-center">
            <p className="text-sm text-muted">
              claims.json was not found in this checkout. Clone the full repository so the thesis
              file exists at the repo root, then reload.
            </p>
            <Link href="/how-it-works" className="micro-label mt-4 inline-block text-accent hover:underline">
              How the scoreboard gets its data →
            </Link>
          </div>
        ) : (
          cards.map(({ claim, status, entry, history }) => (
            <div key={claim.id} id={claim.id} className="scroll-mt-24">
              <ClaimCard claim={claim} status={status} entry={entry} history={history} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
