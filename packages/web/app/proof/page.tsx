import type { Metadata } from "next";
import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";
import { CodeBlock } from "@/components/CodeBlock";
import { computeStatusFromResults, loadPopperState } from "@/lib/popper";
import { formatBlock, formatTimestamp, truncateHash } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Proof Explorer - Popper",
  description:
    "The full proof chain: pre-commitment, hash-pinned snapshots, attested results and reproducible verification.",
};

const REPO = "https://github.com/trinnode/popper-near";
const EXPLORER = "https://explorer.near.org/accounts/popper.trinnode.near";

const PROVENANCE = [
  {
    source: "DefiLlama",
    url: "https://api.llama.fi",
    feeds: "tvl_resilience, volume_run_rate, fee_run_rate, cross_chain_dominance",
    license: "Public API, no key. Data freely reusable with attribution to DefiLlama.",
  },
  {
    source: "CoinGecko",
    url: "https://api.coingecko.com/api/v3",
    feeds: "bear_case_mcap_ratio, price_floor",
    license: "Free public tier, roughly 10 to 30 calls/min. Attribution to CoinGecko required.",
  },
  {
    source: "NEAR RPC",
    url: "https://rpc.mainnet.near.org",
    feeds: "on-chain commit and result reads (get_commit, get_all_results)",
    license: "Public RPC endpoint. Read-only view calls, no wallet required.",
  },
  {
    source: "Repo snapshots",
    url: `${REPO}/tree/main/snapshots`,
    feeds: "snapshot_liveness (meta claim) and every metric history",
    license: "MIT-licensed repository content. Each file SHA-256 pinned in manifest.json.",
  },
];

function StepHeading({ n, title }: { n: string; title: string }) {
  return (
    <h2 className="flex items-baseline gap-3 text-lg font-semibold text-white">
      <span className="mono text-xs text-accent">STEP {n}</span>
      {title}
    </h2>
  );
}

export default async function ProofPage() {
  const state = await loadPopperState();
  const manifest = state.manifest;
  const results = state.results;
  const commit = state.chain.commit;
  const claimsHash = commit?.claims_hash ?? state.claimsHash;
  const verifyOneLiner = `curl -sL ${REPO}/raw/main/claims.json | sha256sum\n# expect: ${claimsHash ?? "(hash lands after first commit)"}`;

  const runItYourself = `git clone ${REPO}
cd popper-near
pnpm install
pnpm verify --snapshot snapshots/$(ls snapshots | grep -v manifest | head -1)
# Expected output: each claim prints HOLDING / AT RISK / PENDING / FALSIFIED
# and the recomputed snapshot SHA-256 hashes match snapshots/manifest.json.`;

  return (
    <div className="pt-10">
      <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Proof Chain</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Four links in the chain, each independently checkable. Nothing on this page requires
        trust in the author: recompute every hash yourself.
      </p>

      {/* ------------------------- STEP 1: COMMITMENT ------------------------ */}
      <section className="mt-10">
        <StepHeading n="1" title="Pre-commitment" />
        <div className="mt-4 border border-line bg-panel">
          <dl className="grid grid-cols-1 gap-x-8 gap-y-3 px-4 py-5 text-sm sm:px-6 md:grid-cols-[180px_1fr]">
            <dt className="micro-label pt-0.5">claims.json SHA-256</dt>
            <dd className="mono break-all text-accent">
              {claimsHash ?? "on-chain data pending first commit"}
              {claimsHash ? (
                <CopyButton value={claimsHash} label="Copy" className="ml-3" />
              ) : null}
            </dd>
            <dt className="micro-label pt-0.5">NEAR block</dt>
            <dd className="mono text-white">
              {commit ? formatBlock(commit.commit_block) : "pending"}
            </dd>
            <dt className="micro-label pt-0.5">NEAR tx</dt>
            <dd>
              {commit ? (
                <a
                  href={EXPLORER}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mono break-all text-accent hover:underline"
                >
                  {EXPLORER} ↗
                </a>
              ) : (
                <span className="text-sm text-faint">
                  commitment transaction pending - will link to explorer.near.org
                </span>
              )}
            </dd>
            <dt className="micro-label pt-0.5">Timestamp</dt>
            <dd className="mono text-white">
              {commit ? formatTimestamp(commit.commit_timestamp) : "pending"}
            </dd>
          </dl>
          <div className="flex flex-wrap items-center gap-3 border-t border-line px-4 py-3 sm:px-6">
            <a
              href={`${REPO}/blob/main/claims.json`}
              target="_blank"
              rel="noopener noreferrer"
              className="mono border border-line px-3 py-1.5 text-[11px] tracking-wider text-white hover:border-accent hover:text-accent"
            >
              ↓ DOWNLOAD claims.json
            </a>
            <Link
              href="/scoreboard"
              className="mono border border-line px-3 py-1.5 text-[11px] tracking-wider text-muted hover:border-accent hover:text-accent"
            >
              → Scoreboard
            </Link>
          </div>
          <div className="border-t border-line px-4 py-4 sm:px-6">
            <CodeBlock code={verifyOneLiner} label="verify hash yourself">
              {verifyOneLiner}
            </CodeBlock>
          </div>
        </div>
      </section>

      {/* -------------------------- STEP 2: SNAPSHOTS ------------------------ */}
      <section className="mt-10">
        <StepHeading n="2" title="Data snapshots (hash-pinned)" />
        {manifest && manifest.snapshots.length > 0 ? (
          <div className="mt-4 overflow-x-auto border border-line">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line bg-panel-2">
                  {["Pulled", "File", "SHA-256", "Sources", "Verify"].map((h) => (
                    <th key={h} className="micro-label px-4 py-2.5 text-left font-normal">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {manifest.snapshots.map((s) => (
                  <tr key={s.file} className="border-b border-line/60 last:border-0">
                    <td className="mono whitespace-nowrap px-4 py-2.5 text-muted">
                      {s.pulled_at ?? s.date ?? "unknown"}
                    </td>
                    <td className="mono px-4 py-2.5 text-white">{s.file}</td>
                    <td className="mono px-4 py-2.5 text-accent">{truncateHash(s.sha256, 8, 4)}</td>
                    <td className="mono px-4 py-2.5 text-muted">
                      {typeof s.sources === "number"
                        ? s.sources
                        : Array.isArray(s.sources)
                          ? s.sources.length
                          : "-"}
                    </td>
                    <td className="px-4 py-2.5">
                      <a
                        href={`${REPO}/tree/main/snapshots`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mono text-xs text-accent hover:underline"
                      >
                        ↗ verify
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-4 border border-dashed border-line px-6 py-10 text-center">
            <p className="text-sm text-muted">
              No snapshots yet. Nightly pulls start after the commitment lands; each one lands in{" "}
              <span className="mono">snapshots/</span> with its SHA-256 recorded in{" "}
              <span className="mono">snapshots/manifest.json</span>.
            </p>
          </div>
        )}
      </section>

      {/* --------------------------- STEP 3: RESULTS ------------------------- */}
      <section className="mt-10">
        <StepHeading n="3" title="Verification results (attested on NEAR)" />
        <div className="mt-4 border border-line bg-panel">
          {results ? (
            <dl className="grid grid-cols-1 gap-x-8 gap-y-3 px-4 py-5 text-sm sm:px-6 md:grid-cols-[180px_1fr]">
              <dt className="micro-label pt-0.5">results.json SHA-256</dt>
              <dd className="mono break-all text-accent">
                {results.results_hash ?? "pending hash publication"}
              </dd>
              <dt className="micro-label pt-0.5">NEAR block</dt>
              <dd className="mono text-white">
                {results.block_height ? formatBlock(results.block_height) : "pending"}
              </dd>
              <dt className="micro-label pt-0.5">NEAR tx</dt>
              <dd>
                {state.chain.connected ? (
                  <a
                    href={EXPLORER}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mono break-all text-accent hover:underline"
                  >
                    {EXPLORER} ↗
                  </a>
                ) : (
                  <span className="text-faint">attestation tx pending</span>
                )}
              </dd>
              <dt className="micro-label pt-0.5">Generated</dt>
              <dd className="mono text-white">{formatTimestamp(results.generated_at)}</dd>
            </dl>
          ) : (
            <p className="px-4 py-5 text-sm text-muted sm:px-6">
              No attested results yet. The first results land when the earliest measurement window
              closes; until then every claim shows{" "}
              <span className="mono text-muted">PENDING</span> on the{" "}
              <Link href="/scoreboard" className="text-accent hover:underline">
                scoreboard
              </Link>
              .
            </p>
          )}
          {results ? (
            <div className="border-t border-line px-4 py-4 sm:px-6">
              <ul className="space-y-1.5">
                {state.claims?.claims.map((c) => {
                  const { status } = computeStatusFromResults(c.id, results);
                  return (
                    <li key={c.id} className="mono flex flex-wrap gap-x-3 text-xs">
                      <span className="text-muted">{c.id}</span>
                      <span
                        className={
                          status === "HOLDING"
                            ? "text-accent"
                            : status === "AT_RISK"
                              ? "text-risk"
                              : status === "FALSIFIED"
                                ? "text-fail"
                                : "text-faint"
                        }
                      >
                        {status}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      {/* ------------------------ STEP 4: RUN IT YOURSELF -------------------- */}
      <section className="mt-10">
        <StepHeading n="4" title="Run it yourself" />
        <p className="mt-2 max-w-2xl text-sm text-muted">
          The engine is deterministic TypeScript with no secrets and no environment variables
          required for the offline check. Same input, same output, on any machine.
        </p>
        <div className="mt-4">
          <CodeBlock code={runItYourself} label="reproduce the verification" />
        </div>
      </section>

      {/* ----------------------------- PROVENANCE ---------------------------- */}
      <section className="mt-14 border-t border-line pt-8">
        <h2 className="micro-label text-white">Provenance</h2>
        <p className="mt-3 max-w-2xl text-sm text-muted">
          Every data source, what it feeds, and its licensing status. If a source changes
          methodology mid-window, the affected claim is flagged rather than silently re-based.
        </p>
        <div className="mt-5 overflow-x-auto border border-line">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line bg-panel-2">
                {["Source", "URL", "Feeds", "License / attribution"].map((h) => (
                  <th key={h} className="micro-label px-4 py-2.5 text-left font-normal">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PROVENANCE.map((p) => (
                <tr key={p.source} className="border-b border-line/60 last:border-0 align-top">
                  <td className="px-4 py-3 font-semibold text-white">{p.source}</td>
                  <td className="px-4 py-3">
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mono break-all text-xs text-accent hover:underline"
                    >
                      {p.url}
                    </a>
                  </td>
                  <td className="mono px-4 py-3 text-xs text-muted">{p.feeds}</td>
                  <td className="px-4 py-3 text-xs leading-relaxed text-muted">{p.license}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
