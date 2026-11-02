"use client";

import { useEffect, useState } from "react";

/**
 * Types a hash character by character on load.
 * Respects prefers-reduced-motion: renders instantly instead.
 */
export function TypewriterHash({
  hash,
  className = "",
  placeholder = "sha256: awaiting first commit",
}: {
  hash: string | null;
  className?: string;
  placeholder?: string;
}) {
  const display = hash ? `sha256:${hash}` : placeholder;
  const [count, setCount] = useState(0);

  useEffect(() => {
    let media: MediaQueryList | null = null;
    try {
      media = window.matchMedia("(prefers-reduced-motion: reduce)");
      if (media.matches) {
        setCount(display.length);
        return;
      }
    } catch {
      setCount(display.length);
      return;
    }
    setCount(0);
    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      setCount(i);
      if (i >= display.length) clearInterval(timer);
    }, 18);
    return () => clearInterval(timer);
  }, [display]);

  return (
    <span className={`mono break-all ${className}`} aria-label={display}>
      {display.slice(0, count)}
      <span
        className="inline-block h-[1em] w-[0.55em] translate-y-[0.12em] bg-accent"
        style={{ opacity: count >= display.length ? 0 : 1 }}
        aria-hidden
      />
    </span>
  );
}
