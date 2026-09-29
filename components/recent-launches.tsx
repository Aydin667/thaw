"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { LaunchListEntry } from "@/lib/types";
import { daysUntil, fmtDate, shortAddr } from "@/lib/format";

export function RecentLaunches({ limit = 12 }: { limit?: number }) {
  const [launches, setLaunches] = useState<LaunchListEntry[] | null>(null);

  useEffect(() => {
    fetch("/api/launches")
      .then((r) => r.json())
      .then((d) => setLaunches(d.launches ?? []))
      .catch(() => setLaunches([]));
  }, []);

  if (launches === null) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="border border-line bg-surface rounded-sm p-5 h-32 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (launches.length === 0) {
    return (
      <div className="border border-line bg-surface rounded-sm p-8 text-center">
        <p className="font-mono text-sm text-muted mb-1">
          no thaw launches yet
        </p>
        <p className="font-mono text-xs text-muted">
          the first thaw launch on this deployment will appear here, read straight
          from the chain
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {launches.slice(0, limit).map((l) => (
        <Link
          key={l.mint}
          href={`/t/${l.mint}`}
          className="border border-line bg-surface rounded-sm p-5 hover:border-green-dim transition-colors group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-sm text-text group-hover:text-green transition-colors">
              {l.symbol ? `$${l.symbol}` : shortAddr(l.mint)}
            </span>
            <span className="font-mono text-[10px] text-green border border-green-dim rounded-sm px-1.5 py-0.5">
              SEALED
            </span>
          </div>
          {l.name && (
            <div className="text-sm text-muted mb-3 truncate">{l.name}</div>
          )}
          <div className="grid grid-cols-2 gap-2 font-mono text-[11px] text-muted">
            <div>
              <div className="text-[10px] uppercase tracking-wide">dev buy</div>
              <div className="text-text">{l.devBuySol.toFixed(2)} SOL</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide">locked</div>
              <div className="text-text">{l.lockedPctOfSupply.toFixed(1)}% supply</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide">cliff</div>
              <div className="text-text">
                {daysUntil(l.cliffTs) > 0 ? `${daysUntil(l.cliffTs)}d left` : "passed"}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide">launched</div>
              <div className="text-text">{fmtDate(l.launchedAt)}</div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
