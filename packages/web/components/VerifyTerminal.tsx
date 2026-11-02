"use client";

import { useEffect, useRef, useState } from "react";
import type { VerifyStep } from "@/lib/popper";

/**
 * Terminal-style modal that POSTs /api/verify and plays back the returned
 * steps line by line like a terminal log. Kept deliberately simple and
 * robust: one POST, JSON response, client-side line replay.
 */
export function VerifyTerminal({ onClose }: { onClose: () => void }) {
  const [lines, setLines] = useState<string[]>(["$ popper verify --offline"]);
  const [running, setRunning] = useState(true);
  const [failed, setFailed] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      let steps: VerifyStep[] = [];
      try {
        const res = await fetch("/api/verify", { method: "POST" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as { ok?: boolean; steps?: VerifyStep[] };
        steps = Array.isArray(json.steps) ? json.steps : [];
        if (json.ok === false) setFailed(true);
      } catch (err) {
        if (!cancelled) {
          setLines((prev) => [
            ...prev,
            `[error] verification request failed: ${err instanceof Error ? err.message : String(err)}`,
          ]);
          setRunning(false);
          setFailed(true);
        }
        return;
      }

      for (const step of steps) {
        if (cancelled) return;
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 140));
        if (cancelled) return;
        const tag =
          step.status === "PASS"
            ? "[ ok ]"
            : step.status === "FAIL"
              ? "[FAIL]"
              : step.status === "WARN"
                ? "[warn]"
                : "[skip]";
        setLines((prev) => [...prev, `${tag} ${step.label} - ${step.detail}`]);
      }
      if (!cancelled) {
        setLines((prev) => [
          ...prev,
          steps.some((s) => s.status === "FAIL")
            ? "INTEGRITY_ERROR: one or more checks failed. Halting."
            : "INTEGRITY_OK: all checks passed. Results below match pinned snapshots.",
          "$ _",
        ]);
        setRunning(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [lines]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Verification terminal"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl border border-line-strong bg-[#0d0d0d] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <span className="micro-label text-white">popper verify - integrity terminal</span>
          <button
            type="button"
            onClick={onClose}
            className="mono cursor-pointer border border-line px-2 py-0.5 text-[11px] text-muted hover:border-fail hover:text-fail"
          >
            ESC / CLOSE
          </button>
        </div>
        <div
          ref={bodyRef}
          className="h-72 overflow-y-auto px-4 py-3 sm:h-80"
          aria-live="polite"
        >
          {lines.map((line, i) => (
            <p
              key={`${i}-${line.slice(0, 12)}`}
              className={`mono whitespace-pre-wrap break-words py-0.5 text-xs leading-5 ${
                line.startsWith("[FAIL]") || line.includes("INTEGRITY_ERROR")
                  ? "text-fail"
                  : line.startsWith("[warn]")
                    ? "text-risk"
                    : line.startsWith("[ ok ]") || line.includes("INTEGRITY_OK")
                      ? "text-accent"
                      : line.startsWith("$")
                        ? "text-white"
                        : "text-muted"
              }`}
            >
              {line}
            </p>
          ))}
          {running ? (
            <p className="mono py-0.5 text-xs text-accent" aria-hidden>
              ▌
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
