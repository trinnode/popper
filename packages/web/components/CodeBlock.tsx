"use client";

import { useState, type ReactNode } from "react";
import { CopyButton } from "./CopyButton";

/**
 * Copyable terminal/code box. `command` is copied verbatim; children render.
 */
export function CodeBlock({
  code,
  label,
  children,
}: {
  code: string;
  label?: string;
  children?: ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore: the user can still select the text
    }
  }

  return (
    <div className="border border-line bg-[#0d0d0d]">
      <div className="flex items-center justify-between border-b border-line px-4 py-2">
        <span className="micro-label">{label ?? "terminal"}</span>
        <button
          type="button"
          onClick={copyAll}
          className="mono cursor-pointer border border-line px-2 py-1 text-[11px] tracking-wider text-muted transition-colors hover:border-accent hover:text-accent"
        >
          {copied ? "COPIED" : "COPY ALL"}
        </button>
      </div>
      <div className="overflow-x-auto px-4 py-3">
        <pre className="mono whitespace-pre text-xs leading-6 text-white sm:text-[13px]">
          {children ?? code}
        </pre>
      </div>
    </div>
  );
}

export { CopyButton };
