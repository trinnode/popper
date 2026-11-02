import Link from "next/link";

const NAV_LINKS = [
  { href: "/scoreboard", label: "Scoreboard" },
  { href: "/proof", label: "Proof" },
  { href: "/how-it-works", label: "How It Works" },
];

export function Navbar() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3" aria-label="Popper home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-icon.svg" alt="" width={30} height={30} />
          <span className="mono text-sm font-bold tracking-[0.3em] text-white">POPPER</span>
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-4 sm:gap-7">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="micro-label transition-colors hover:text-accent"
            >
              {l.label}
            </Link>
          ))}
          <a
            href="https://github.com/trinnode/popper-near"
            target="_blank"
            rel="noopener noreferrer"
            className="micro-label hidden text-accent hover:underline sm:inline"
          >
            GitHub ↗
          </a>
        </nav>
      </div>
    </header>
  );
}
