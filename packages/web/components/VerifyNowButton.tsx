"use client";

import { useState } from "react";
import { VerifyTerminal } from "./VerifyTerminal";

export function VerifyNowButton({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`mono cursor-pointer border border-accent/60 bg-accent/10 px-3 py-1.5 text-xs tracking-wider text-accent transition-colors hover:bg-accent/20 ${className}`}
      >
        ↻ VERIFY NOW
      </button>
      {open ? <VerifyTerminal onClose={() => setOpen(false)} /> : null}
    </>
  );
}
