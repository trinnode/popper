import type { ClaimStatus } from "@/lib/popper";

export const STATUS_META: Record<
  ClaimStatus,
  { label: string; color: string; textClass: string; dotClass: string }
> = {
  HOLDING: {
    label: "HOLDING",
    color: "#00EC97",
    textClass: "text-accent",
    dotClass: "bg-accent",
  },
  AT_RISK: {
    label: "AT RISK",
    color: "#FFB224",
    textClass: "text-risk",
    dotClass: "bg-risk",
  },
  PENDING: {
    label: "PENDING",
    color: "#8A8A8A",
    textClass: "text-muted",
    dotClass: "bg-muted",
  },
  FALSIFIED: {
    label: "FALSIFIED",
    color: "#FF4D6D",
    textClass: "text-fail",
    dotClass: "bg-fail",
  },
};

export function StatusDot({ status, className = "" }: { status: ClaimStatus; className?: string }) {
  const meta = STATUS_META[status];
  return (
    <span className={`relative inline-flex h-2.5 w-2.5 shrink-0 ${className}`}>
      <span className={`absolute inset-0 rounded-full ${meta.dotClass}`} />
      {status === "PENDING" ? (
        <span className="absolute inset-0 rounded-full border border-bg bg-transparent" />
      ) : null}
    </span>
  );
}

export function StatusBadge({ status }: { status: ClaimStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-2 ${meta.textClass}`}>
      <StatusDot status={status} />
      <span className="mono text-xs font-semibold tracking-[0.15em]">{meta.label}</span>
    </span>
  );
}
