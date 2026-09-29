"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { shortAddr } from "@/lib/format";

export function WalletButton() {
  const { publicKey, wallets, select, connect, disconnect, connecting, wallet } =
    useWallet();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const pick = useCallback(
    async (name: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      select(name as any);
      setOpen(false);
    },
    [select],
  );

  // auto-connect after selection
  useEffect(() => {
    if (wallet && !publicKey && !connecting) {
      connect().catch(() => {
        /* user rejected — fine */
      });
    }
  }, [wallet, publicKey, connecting, connect]);

  const installed = wallets.filter(
    (w) =>
      w.readyState === WalletReadyState.Installed ||
      w.readyState === WalletReadyState.Loadable,
  );

  if (publicKey) {
    return (
      <div className="relative" ref={ref}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="font-mono text-sm border border-line bg-surface hover:bg-surface-2 hover:border-green-dim text-text px-3 py-1.5 rounded-sm transition-colors"
        >
          <span className="text-green mr-2">●</span>
          {shortAddr(publicKey.toBase58())}
        </button>
        {menuOpen && (
          <div className="absolute right-0 mt-2 w-44 border border-line bg-surface rounded-sm z-50 rise">
            <button
              onClick={() => {
                navigator.clipboard.writeText(publicKey.toBase58());
                setMenuOpen(false);
              }}
              className="block w-full text-left px-3 py-2 font-mono text-xs text-muted hover:text-text hover:bg-surface-2"
            >
              copy address
            </button>
            <button
              onClick={() => {
                disconnect();
                setMenuOpen(false);
              }}
              className="block w-full text-left px-3 py-2 font-mono text-xs text-muted hover:text-red hover:bg-surface-2"
            >
              disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={connecting}
        className="font-mono text-sm bg-green text-bg font-medium px-4 py-1.5 rounded-sm hover:bg-green-hi active:translate-y-px transition-all disabled:opacity-50"
      >
        {connecting ? "connecting…" : "connect wallet"}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 border border-line bg-surface rounded-sm z-50 rise">
          <div className="px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-muted border-b border-line">
            select wallet
          </div>
          {installed.length === 0 && (
            <div className="px-3 py-4 text-sm text-muted">
              No Solana wallet detected. Install{" "}
              <a
                href="https://phantom.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green hover:underline"
              >
                Phantom
              </a>{" "}
              or{" "}
              <a
                href="https://solflare.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green hover:underline"
              >
                Solflare
              </a>
              , then reload.
            </div>
          )}
          {installed.map((w) => (
            <button
              key={w.adapter.name}
              onClick={() => pick(w.adapter.name)}
              className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-surface-2 transition-colors"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={w.adapter.icon} alt="" className="w-5 h-5 rounded-sm" />
              <span className="font-mono text-sm">{w.adapter.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
