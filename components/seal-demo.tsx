"use client";

/**
 * Interactive demo of the sealed-launch bundle: steps through the three
 * transactions and shows the all-or-nothing property.
 */
import { useCallback, useEffect, useRef, useState } from "react";

const STEPS = [
  {
    tag: "tx 1",
    title: "create_v2 + capped buy",
    lines: [
      "> pump.fun: create token",
      "> pump.fun: dev buy (hard-capped)",
      "  nothing can trade before this buy",
    ],
  },
  {
    tag: "tx 2",
    title: "start thaw + assert",
    lines: [
      "> jupiter lock: escrow 100% of dev buy",
      "  no cliff · linear from second zero",
      "> lighthouse: assert dev wallet == 0",
      "  false → entire bundle reverts",
    ],
  },
  {
    tag: "tx 3",
    title: "certificate",
    lines: [
      "> attestation: write thaw schedule",
      "  mint, escrow, melt rate, bundle sig",
      "  queryable by any bot or terminal",
    ],
  },
];

export function SealDemo() {
  const [step, setStep] = useState(-1);
  const [sealed, setSealed] = useState(false);
  const [running, setRunning] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const run = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setSealed(false);
    setRunning(true);
    setStep(-1);
    [0, 1, 2].forEach((i) => {
      timers.current.push(setTimeout(() => setStep(i), 350 + i * 900));
    });
    timers.current.push(
      setTimeout(() => {
        setSealed(true);
        setRunning(false);
      }, 350 + 3 * 900),
    );
  }, []);

  useEffect(() => {
    const t = setTimeout(run, 600);
    return () => {
      clearTimeout(t);
      timers.current.forEach(clearTimeout);
    };
  }, [run]);

  return (
    <div className="border border-line bg-surface rounded-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-line">
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted">
          one jito bundle · one slot · all or nothing
        </span>
        <button
          onClick={run}
          disabled={running}
          className="font-mono text-xs text-green hover:text-green-hi disabled:opacity-40 transition-colors"
        >
          {running ? "landing…" : "replay ↻"}
        </button>
      </div>
      <div className="p-4 grid gap-3 sm:grid-cols-3">
        {STEPS.map((s, i) => {
          const active = step >= i;
          return (
            <div
              key={s.tag}
              className={`border rounded-sm p-3 transition-all duration-300 ${
                active
                  ? "border-green-dim bg-surface-2 opacity-100"
                  : "border-line opacity-40"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-pixel text-[10px] text-muted">{s.tag}</span>
                <span
                  className={`font-mono text-[10px] ${
                    active ? "text-green" : "text-muted"
                  }`}
                >
                  {active ? "[ OK ]" : "[ .. ]"}
                </span>
              </div>
              <div className="font-mono text-xs text-text mb-2">{s.title}</div>
              <div className="font-mono text-[11px] leading-relaxed text-muted whitespace-pre-wrap">
                {s.lines.join("\n")}
              </div>
            </div>
          );
        })}
      </div>
      <div className="px-4 pb-4">
        <div
          className={`border rounded-sm px-4 py-3 flex flex-wrap items-center justify-between gap-2 transition-colors ${
            sealed ? "border-green bg-green-dim/30" : "border-line"
          }`}
        >
          <span className="font-mono text-sm">
            {sealed ? (
              <span className="text-green seal-stamp inline-block">
                ≈ THAWING — dev bag melting in public from second zero
              </span>
            ) : running ? (
              <span className="text-muted">
                bundle in flight<span className="cursor-blink">▌</span>
              </span>
            ) : (
              <span className="text-muted">idle</span>
            )}
          </span>
          <span className="font-mono text-[11px] text-muted">
            if any step fails, the token is never created
          </span>
        </div>
      </div>
    </div>
  );
}
