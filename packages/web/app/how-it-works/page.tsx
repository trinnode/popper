import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "How It Works - Popper",
  description:
    "Pre-registration, the deterministic verification engine, and the NEAR contract that makes the commitment immutable.",
};

const COLUMNS = [
  {
    n: "01",
    title: "Pre-Registration",
    body: (
      <>
        <p>
          Before a clinical trial runs, researchers register the hypothesis, the sample size and
          the analysis plan. That registry entry is timestamped, so nobody can quietly change the
          question after seeing the results. It is the strongest known defense against p-hacking.
        </p>
        <p>
          Popper applies the identical discipline to an investment thesis. The claim, the exact
          metric, the data source, the numeric threshold and the kill condition are all written
          into <span className="mono text-white">claims.json</span>, hashed with SHA-256, and
          committed to NEAR before any measurement window opens. The block height on the
          commitment is cryptographic proof the thesis predated the data.
        </p>
      </>
    ),
  },
  {
    n: "02",
    title: "The Engine",
    body: (
      <>
        <p>
          The verifier is deterministic TypeScript with no LLM in the loop and no secrets. Each
          night it pulls snapshots from DefiLlama, CoinGecko and the NEAR RPC, writes them to{" "}
          <span className="mono text-white">snapshots/</span>, and records the SHA-256 of every
          file in <span className="mono text-white">snapshots/manifest.json</span>.
        </p>
        <p>
          When a measurement window closes it evaluates each claim against the pinned data:
          HOLDING when the value clears the threshold with margin, AT RISK inside the declared
          risk band, FALSIFIED when the kill condition breaches. Anyone can re-run it from a cold
          clone and get byte-identical results.
        </p>
      </>
    ),
  },
  {
    n: "03",
    title: "The Contract",
    body: (
      <>
        <p>
          The commitment lives on NEAR mainnet at{" "}
          <span className="mono text-white">popper.trinnode.near</span>.{" "}
          <span className="mono text-white">store_commit()</span> panics if a commitment already
          exists, so the thesis cannot be quietly rewritten. Results are immutable per claim
          too: <span className="mono text-white">store_result()</span> cannot overwrite an
          attested outcome.
        </p>
        <p>
          Reads are plain view calls: no wallet, no gas, no sign-in. Anyone can query{" "}
          <span className="mono text-white">get_commit()</span> and{" "}
          <span className="mono text-white">get_all_results()</span> and compare them against
          the repo. Only the admin account can write, and every write is a permanent public
          transaction.
        </p>
      </>
    ),
  },
];

const FAQ = [
  {
    q: "What if a data source changes its methodology mid-window?",
    a: "Every response is hashed at pull time. If a source shifts its definition, the snapshot records the raw payload and the engine flags source_changed instead of silently re-basing the metric. Contested numbers are modeled as a finding: the claim card shows the note and the disputed sources rather than hiding them.",
  },
  {
    q: "Can the author lie in results.json?",
    a: "Lying locally achieves nothing. The attested result on NEAR must match what anyone re-running the engine computes from the pinned snapshots. A mismatch between the repo, the snapshots and the on-chain attestation is immediately visible, and the verify terminal on the scoreboard recomputes hashes on demand.",
  },
  {
    q: "What stops editing claims.json after the fact?",
    a: "Its SHA-256 is stored on NEAR in store_commit() before the measurement window opens, and store_commit() panics if called twice. Any edit to claims.json changes the hash and produces COMMIT_MISMATCH, which invalidates every result. Git history plus the block height make the original version provable.",
  },
  {
    q: "Why NEAR?",
    a: "NEAR gives cheap, permanent, publicly readable state. View calls cost nothing and need no wallet, so the whole thesis is auditable by anyone with an HTTP client. The thesis itself is about the NEAR Intents stack, so the commitment layer and the subject matter line up.",
  },
  {
    q: "What does AT RISK mean exactly?",
    a: "Each claim declares an at_risk_zone between its kill threshold and its required threshold. A measured value inside that band means the claim has not failed yet but is heading toward falsification. It is the amber light: HOLDING means comfortably above the risk band, AT RISK means inside it.",
  },
  {
    q: "How are the kill conditions chosen?",
    a: "Kill conditions are numeric on purpose: the engine must evaluate them without interpretation. They were frozen before the windows opened and set far enough from the thresholds that ordinary noise cannot falsify a claim, but far enough below it that genuine failure is caught. The bear case claim is deliberately included so the thesis can visibly lose.",
  },
  {
    q: "What happens if a nightly snapshot is missed?",
    a: "The snapshot liveness claim is itself on the scoreboard as a meta claim: 12 of 12 scheduled snapshots must land with valid hashes or the meta claim reads FALSIFIED. The thesis verifies its own verification process.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="pt-10">
      <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">How It Works</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Three mechanisms, one guarantee: the thesis was written before the data, and anyone can
        prove it.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        {COLUMNS.map((c) => (
          <section key={c.n} className="flex flex-col border border-line bg-panel p-5">
            <span className="mono text-xs text-accent">{c.n}</span>
            <h2 className="mt-2 text-lg font-semibold text-white">{c.title}</h2>
            <div className="mt-3 flex-1 space-y-3 text-sm leading-relaxed text-muted">{c.body}</div>
            <Link
              href="/proof"
              className="micro-label mt-5 inline-block text-accent hover:underline"
            >
              Verify this claim in the proof explorer →
            </Link>
          </section>
        ))}
      </div>

      <section aria-labelledby="faq" className="mt-14 border-t border-line pt-8">
        <h2 id="faq" className="micro-label text-white">
          Frequently questioned answers
        </h2>
        <div className="mt-6 divide-y divide-line border border-line bg-panel">
          {FAQ.map((f) => (
            <details key={f.q} className="group px-4 py-4 sm:px-6">
              <summary className="cursor-pointer list-none text-sm font-semibold text-white marker:hidden group-open:text-accent sm:text-base">
                <span className="mono mr-2 text-accent">Q</span>
                {f.q}
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted">{f.a}</p>
              <Link href="/proof" className="micro-label mt-3 inline-block text-accent hover:underline">
                See the proof chain →
              </Link>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
