"use client";

import { useState } from "react";

export function CopyButton({
  value,
  label = "Copy",
  className = "",
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // clipboard API unavailable (http context): fall back to a temp textarea
      const ta = document.createElement("textarea");
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        // give up silently
      }
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={`mono cursor-pointer border border-line px-2 py-1 text-[11px] tracking-wider text-muted transition-colors hover:border-accent hover:text-accent ${className}`}
      aria-label={copied ? "Copied" : label}
    >
      {copied ? "COPIED" : label.toUpperCase()}
    </button>
  );
}
