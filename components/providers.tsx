"use client";

import { useMemo } from "react";
import { WalletProvider } from "@solana/wallet-adapter-react";

export function Providers({ children }: { children: React.ReactNode }) {
  // Empty adapter list: modern wallets (Phantom, Solflare, Backpack, …)
  // register themselves via the Wallet Standard and are auto-detected.
  const wallets = useMemo(() => [], []);
  return (
    <WalletProvider wallets={wallets} autoConnect>
      {children}
    </WalletProvider>
  );
}
