import Link from "next/link";
import { CommitmentCard } from "@/components/CommitmentCard";
import { StatusDot } from "@/components/StatusDot";
import { computeStatusFromResults, loadPopperState } from "@/lib/popper";
import { formatPct, formatUsd } from "@/lib/format";
import type { Claim } from "@/lib/popper";

export const dynamic = "force-dynamic";

const DATA_SOURCES = [
  {
    name: "DefiLlama API",
    url: "https://api.llama.fi",
    endpoints: [
      "/protocol/near-intents (TVL)",
      "/overview/dexs?category=Bridge (bridge volume share)",
      "/summary/dexs/near-intents (30d volume)",
      "/overview/fees (protocol fees)",
    ],
    note: "Keyless public API. Feeds the TVL, volume, dominance and fee claims.",
  },
  {
    name: "CoinGecko API",
    url: "https://api.coingecko.com/api/v3/simple/price",
    endpoints: ["/simple/price?ids=near,ethereum&vs_currencies=usd&include_market_cap=true"],
    note: "Free public tier. Feeds the market cap ratio bear case and the price floor claim.",
  },
  {
    name: "NEAR RPC",
    url: process.env.NEXT_PUBLIC_NEAR_RPC_URL || "https://rpc.mainnet.near.org",
    endpoints: [
      "query call_function get_commit",
      "query call_function get_all_results",
    ],
    note: `Read-only view calls against ${process.env.NEXT_PUBLIC_POPPER_CONTRACT_ID || "popper.trinnode.near"}. No wallet needed to read.`,
  },
  {
    name: "GitHub snapshots",
    url: "https://github.com/trinnode/popper-near/tree/main/snapshots",
    endpoints: ["snapshots/manifest.json", "snapshots/*.json"],
    note: "Every snapshot is SHA-256 pinned and listed in the manifest.",
  },
];

function claimChipValue(c: Claim): string {
  const t = c.threshold;
  if (typeof t.min_pct === "number") return `>= ${t.min_pct}%`;
  if (typeof t.min === "number") {
    return c.metric.includes("usd") || c.metric.includes("tvl") || c.metric.includes("volume")
      ? `>= ${formatUsd(t.min)}`
      : `>= ${t.min}`;
  }
  if (typeof t.max_ratio === "number") return `<= ${t.max_ratio}`;
  return "see claims.json";
}

export default async function LandingPage() {
  const state = await loadPopperState();
  const claims = state.claims?.claims ?? [];
  const results = state.results;

  return (
    <div>
      {/* ------------------------------- HERO ------------------------------- */}
      <section className="pb-14 pt-16 sm:pt-24">
        <figure className="mx-auto max-w-3xl text-center">
          <blockquote className="text-2xl font-medium leading-snug text-white sm:text-4xl">
            &ldquo;A thesis only means something
            <br />
            if it can be falsified.&rdquo;
          </blockquote>
          <figcaption className="mono mt-4 text-sm text-muted">- Karl Popper</figcaption>
        </figure>

        <div className="mx-auto mt-12 max-w-3xl text-center">
          <h1 className="text-xl leading-relaxed text-white sm:text-2xl">
            The first on-chain pre-registered investment thesis
            <br className="hidden sm:block" /> for NEAR Protocol.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
            {claims.length || 7} claims. Committed to NEAR before the data arrived. Anyone can
            verify. The thesis can lose.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-3xl">
          <CommitmentCard chain={state.chain} localHash={state.claimsHash} />
        </div>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/scoreboard"
            className="mono w-full border border-accent bg-accent px-6 py-3 text-center text-sm font-semibold tracking-wider text-black transition-colors hover:bg-accent/85 sm:w-auto"
          >
            → VIEW SCOREBOARD
          </Link>
          <Link
            href="/how-it-works"
            className="mono w-full border border-line px-6 py-3 text-center text-sm tracking-wider text-white transition-colors hover:border-accent hover:text-accent sm:w-auto"
          >
            → HOW IT WORKS
          </Link>
        </div>
      </section>

      {/* ------------------------ THESIS AT A GLANCE ------------------------ */}
      <section aria-labelledby="glance" className="border-t border-line py-10">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="glance" className="micro-label text-white">
            Thesis at a glance
          </h2>
          <Link href="/scoreboard" className="micro-label text-accent hover:underline">
            Full scoreboard →
          </Link>
        </div>
        {claims.length === 0 ? (
          <p className="mt-5 text-sm text-muted">
            claims.json not found in this checkout - the scoreboard will populate once the thesis
            file exists.
          </p>
        ) : (
          <ul className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {claims.map((c) => {
              const { status } = computeStatusFromResults(c.id, results);
              return (
                <li key={c.id}>
                  <Link
                    href={`/scoreboard#${c.id}`}
                    className="flex items-start gap-3 border border-line bg-panel px-3.5 py-3 transition-colors hover:border-accent/50"
                  >
                    <StatusDot status={status} className="mt-1" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-white" title={c.title}>
                        {c.title}
                      </span>
                      <span className="mono mt-1 block text-[11px] text-faint">
                        {claimChipValue(c)} · {status.replace("_", " ")}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* --------------------- WHY PRE-REGISTRATION ------------------------- */}
      <section aria-labelledby="prereg" className="border-t border-line py-10">
        <h2 id="prereg" className="micro-label text-white">
          Why pre-registration matters
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          Clinical trials pre-register hypotheses so outcomes cannot be cherry-picked after the
          fact. Popper applies the same discipline to an investment thesis: the claims, thresholds
          and kill conditions are hashed and timestamped on NEAR before the measurement windows
          open.
        </p>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            {
              step: "01",
              title: "Pre-register",
              body: "claims.json is written with numeric thresholds and kill conditions, hashed with SHA-256 and committed on-chain. The block height proves it predates the data.",
            },
            {
              step: "02",
              title: "Measure",
              body: "Nightly snapshots from DefiLlama, CoinGecko and NEAR RPC are pulled, hashed and pinned to the repo. Every number the engine uses is auditable.",
            },
            {
              step: "03",
              title: "Attest",
              body: "When windows close, the deterministic engine evaluates each claim and attests the result on NEAR. HOLDING, AT RISK or FALSIFIED - the thesis can lose.",
            },
          ].map((s) => (
            <Link
              key={s.step}
              href="/how-it-works"
              className="group border border-line bg-panel p-5 transition-colors hover:border-accent/50"
            >
              <span className="mono text-xs text-accent">{s.step}</span>
              <h3 className="mt-2 text-lg font-semibold text-white group-hover:text-accent">
                {s.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
              <span className="micro-label mt-4 inline-block text-accent opacity-0 transition-opacity group-hover:opacity-100">
                How it works →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* --------------------------- DATA SOURCES --------------------------- */}
      <section aria-labelledby="sources" className="border-t border-line py-10">
        <h2 id="sources" className="micro-label text-white">
          Data sources
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-muted">
          Every API the engine reads, with its exact URL. All keyless and public as of Nov 2026.
        </p>
        <div className="mt-6 space-y-3">
          {DATA_SOURCES.map((s) => (
            <div key={s.name} className="border border-line bg-panel px-4 py-4 sm:px-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold text-white">{s.name}</h3>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mono break-all text-xs text-accent hover:underline"
                >
                  {s.url} ↗
                </a>
              </div>
              <ul className="mt-2 flex flex-wrap gap-2">
                {s.endpoints.map((e) => (
                  <li key={e} className="mono border border-line px-2 py-0.5 text-[11px] text-muted">
                    {e}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs leading-relaxed text-faint">{s.note}</p>
            </div>
          ))}
        </div>
        <p className="mono mt-4 text-[11px] text-faint">
          Baseline context: NEAR Intents carried {formatPct(64.45)} of tracked 7d bridge volume at
          the {formatUsd(201566310)} TVL baseline pull on 2026-11-01. Full provenance on the{" "}
          <Link href="/proof" className="text-accent hover:underline">
            proof page
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
