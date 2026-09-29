"use client";

import { useCallback, useEffect, useState } from "react";
import type { VerificationReport } from "@/lib/types";
import { fmtDate, fmtTokensRaw, shortAddr } from "@/lib/format";

export function VerifyPanel({ mint }: { mint: string }) {
  const [report, setReport] = useState<VerificationReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  const load = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch(`/api/verify/${mint}`);
      const json = await res.json();
      if (json.error) {
        setError(json.error.message);
      } else {
        setReport(json);
        setError(null);
      }
    } catch {
      setError("Could not reach the verifier.");
    } finally {
      setChecking(false);
    }
  }, [mint]);

  useEffect(() => {
    load();
  }, [load]);

  if (checking && !report) {
    return (
      <div className="border border-line bg-surface rounded-sm p-8">
        <div className="font-mono text-sm text-muted">
          checking chain state<span className="cursor-blink">▌</span>
        </div>
      </div>
    );
  }

  if (error && !report) {
    return (
      <div className="border border-red/40 bg-surface rounded-sm p-8 font-mono text-sm text-red">
        {error}
      </div>
    );
  }
  if (!report) return null;

  const sealedBadge = report.sealed ? (
    <span className="font-pixel text-green">≈ ON THAW</span>
  ) : (
    <span className="font-pixel text-red">□ NOT ON THAW</span>
  );

  return (
    <div className="space-y-4">
      <div
        className={`border rounded-sm overflow-hidden ${
          report.sealed ? "border-green-dim" : "border-red/40"
        }`}
      >
        <div
          className={`px-5 py-4 flex flex-wrap items-center justify-between gap-3 border-b ${
            report.sealed
              ? "border-green-dim bg-green-dim/15"
              : "border-red/40 bg-red/5"
          }`}
        >
          <div className="flex items-center gap-4">
            {report.imageUri && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={report.imageUri}
                alt=""
                className="w-10 h-10 rounded-sm border border-line object-cover"
              />
            )}
            <div>
              <div className="font-mono text-base text-text">
                {report.symbol ? `$${report.symbol}` : shortAddr(report.mint)}
                {report.name && (
                  <span className="text-muted ml-2 text-sm">{report.name}</span>
                )}
              </div>
              <div className="font-mono text-[11px] text-muted break-all">
                {report.mint}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {sealedBadge}
            <button
              onClick={load}
              disabled={checking}
              className="font-mono text-xs text-muted hover:text-green transition-colors disabled:opacity-40"
            >
              {checking ? "…" : "re-check ↻"}
            </button>
          </div>
        </div>

        {report.sealed && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-line">
            <Stat label="dev buy" value={`${report.devBuySol?.toFixed(2)} SOL`} />
            <Stat
              label="dev share"
              value={`${report.lockedPctOfSupply?.toFixed(1)}% supply`}
            />
            <Stat
              label="still frozen"
              value={
                report.remainingLockedRaw
                  ? fmtTokensRaw(report.remainingLockedRaw)
                  : "—"
              }
            />
            <Stat
              label="fully thawed"
              value={report.vestEndTs ? fmtDate(report.vestEndTs) : "—"}
            />
          </div>
        )}

        <div className="divide-y divide-line">
          {report.checks.map((c) => (
            <div key={c.id} className="px-5 py-3.5 flex gap-4">
              <span
                className={`font-mono text-xs shrink-0 mt-0.5 ${
                  c.status === "ok"
                    ? "text-green"
                    : c.status === "warn"
                      ? "text-amber"
                      : c.status === "pending"
                        ? "text-muted"
                        : "text-red"
                }`}
              >
                {c.status === "ok"
                  ? "[ OK ]"
                  : c.status === "warn"
                    ? "[WARN]"
                    : c.status === "pending"
                      ? "[ .. ]"
                      : "[FAIL]"}
              </span>
              <div className="min-w-0">
                <div className="font-mono text-sm text-text">{c.label}</div>
                <p className="font-mono text-xs text-muted leading-relaxed mt-0.5">
                  {c.detail}
                  {c.link && (
                    <>
                      {" "}
                      <a
                        href={c.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green hover:underline"
                      >
                        view →
                      </a>
                    </>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 font-mono text-sm">
        <a
          href={report.links.pumpFun}
          target="_blank"
          rel="noopener noreferrer"
          className="border border-line rounded-sm px-4 py-2 hover:border-green-dim transition-colors"
        >
          trade on pump.fun →
        </a>
        <a
          href={report.links.solscan}
          target="_blank"
          rel="noopener noreferrer"
          className="border border-line rounded-sm px-4 py-2 hover:border-green-dim transition-colors"
        >
          solscan →
        </a>
        {report.links.escrow && (
          <a
            href={report.links.escrow}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-line rounded-sm px-4 py-2 hover:border-green-dim transition-colors"
          >
            escrow →
          </a>
        )}
        <a
          href={`/api/verify/${report.mint}`}
          target="_blank"
          className="border border-line rounded-sm px-4 py-2 text-muted hover:border-green-dim hover:text-text transition-colors"
        >
          raw json →
        </a>
      </div>

      <p className="font-mono text-[11px] text-muted leading-relaxed">
        every check above was evaluated against live chain state at{" "}
        {new Date(report.checkedAt).toLocaleTimeString()} — this page is a
        verifier, not a badge. Thaw proves the creator&apos;s capped bag can
        only leave on the public melt schedule shown; it does not prevent
        third-party snipers or wallets funded outside this launch.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface px-4 py-3">
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted">
        {label}
      </div>
      <div className="font-mono text-sm text-text mt-0.5">{value}</div>
    </div>
  );
}
