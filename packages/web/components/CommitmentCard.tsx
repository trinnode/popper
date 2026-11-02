import Link from "next/link";
import type { ChainState } from "@/lib/popper";
import { formatBlock, formatTimestamp, truncateHash } from "@/lib/format";
import { CopyButton } from "./CopyButton";
import { TypewriterHash } from "./TypewriterHash";

/**
 * The commitment block card on the landing hero. Renders real on-chain data
 * when the contract exists, otherwise clearly-marked placeholders.
 */
export function CommitmentCard({ chain, localHash }: { chain: ChainState; localHash: string | null }) {
  const commit = chain.commit;
  const hash = commit?.claims_hash ?? localHash ?? null;
  const isCommitted = Boolean(commit);

  return (
    <div className="border border-line bg-panel">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5 sm:px-6">
        <span className="micro-label">On-chain commitment</span>
        <span
          className={`mono text-[11px] tracking-wider ${isCommitted ? "text-accent" : "text-muted"}`}
        >
          {isCommitted ? `COMMITTED · ${chain.contractId}` : "AWAITING FIRST COMMIT"}
        </span>
      </div>
      <dl className="grid grid-cols-1 gap-x-8 gap-y-3 px-4 py-5 text-sm sm:px-6 md:grid-cols-[180px_1fr]">
        <dt className="micro-label pt-0.5">Commitment block</dt>
        <dd className="mono text-white">
          {commit ? formatBlock(commit.commit_block) : "#000,000,000"}
          {!commit && <span className="ml-2 text-xs text-faint">(on-chain data pending first commit)</span>}
        </dd>

        <dt className="micro-label pt-0.5">Committed at</dt>
        <dd className="mono text-white">
          {commit ? formatTimestamp(commit.commit_timestamp) : "pending"}
        </dd>

        <dt className="micro-label pt-0.5">Claims hash</dt>
        <dd className="flex flex-wrap items-center gap-3">
          <TypewriterHash hash={hash} className="text-accent" />
          {hash ? <CopyButton value={hash} label="Copy" /> : null}
        </dd>

        <dt className="micro-label pt-0.5">Verification</dt>
        <dd className="text-sm text-muted">
          {isCommitted ? (
            <Link
              href="/proof"
              className="mono text-accent underline decoration-line underline-offset-4 hover:decoration-accent"
            >
              Inspect the proof chain →
            </Link>
          ) : (
            <span>
              The claims hash will be stored on NEAR via{" "}
              <span className="mono text-white">{chain.contractId}</span> before the measurement
              window opens. Until then, run the offline check on the{" "}
              <Link href="/proof" className="text-accent hover:underline">
                proof page
              </Link>
              .
            </span>
          )}
        </dd>
      </dl>
      {hash && !commit ? (
        <p className="border-t border-line px-4 py-2.5 text-xs text-faint sm:px-6">
          Hash shown is the local SHA-256 of claims.json ({truncateHash(hash, 8, 6)}). On-chain
          attestation pending.
        </p>
      ) : null}
    </div>
  );
}
