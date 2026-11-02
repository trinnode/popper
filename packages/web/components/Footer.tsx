import Link from "next/link";

const PROJECT_LINKS = [
  { href: "/scoreboard", label: "Scoreboard" },
  { href: "/proof", label: "Proof Explorer" },
  { href: "/how-it-works", label: "How It Works" },
];

const DATA_LINKS = [
  { href: "/api/state", label: "manifest (API state)", external: false },
  {
    href: "https://github.com/trinnode/popper-near/blob/main/claims.json",
    label: "claims.json",
    external: true,
  },
  {
    href: "https://github.com/trinnode/popper-near/tree/main/snapshots",
    label: "snapshots directory",
    external: true,
  },
  {
    href: "https://github.com/trinnode/popper-near/tree/main/results",
    label: "results directory",
    external: true,
  },
];

const NEAR_LINKS = [
  {
    href: "https://explorer.near.org/accounts/popper.trinnode.near",
    label: "NEAR Explorer",
    external: true,
  },
  { href: "https://docs.near.org", label: "docs.near.org", external: true },
  {
    href: "https://docs.near.org/intents/overview",
    label: "NEAR Intents docs",
    external: true,
  },
];

function FooterColumn({ title, links }: { title: string; links: { href: string; label: string; external?: boolean }[] }) {
  return (
    <div>
      <h3 className="micro-label mb-3 text-white">{title}</h3>
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={`${l.href}-${l.label}`}>
            {l.external ? (
              <a
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted transition-colors hover:text-accent"
              >
                {l.label} ↗
              </a>
            ) : (
              <Link href={l.href} className="text-sm text-muted transition-colors hover:text-accent">
                {l.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-full.svg" alt="Popper wordmark" width={150} height={46} className="mb-4" />
            <p className="text-sm leading-relaxed text-muted">
              The first on-chain pre-registered, falsifiable investment thesis for NEAR Protocol.
            </p>
          </div>
          <FooterColumn title="Project" links={PROJECT_LINKS} />
          <FooterColumn title="Data" links={DATA_LINKS} />
          <FooterColumn title="Built on NEAR" links={NEAR_LINKS} />
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-line pt-6 text-xs text-faint sm:flex-row sm:items-center sm:justify-between">
          <p>Built by trinnode for the NEAR Build Beyond Boundaries hackathon, Nov 2026</p>
          <p className="mono">MIT License - source at github.com/trinnode/popper-near</p>
        </div>
      </div>
    </footer>
  );
}
