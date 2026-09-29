import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 space-y-6 text-sm text-muted leading-relaxed">
      <h1 className="font-pixel text-2xl text-text">
        <span className="text-green">&gt;</span> PRIVACY
      </h1>
      <p className="font-mono text-xs">Last updated: September 29, 2026</p>
      <h2 className="font-mono text-text">What we collect</h2>
      <p>
        No accounts, no emails, no third-party analytics or ad trackers. We
        process: (1) the wallet address you connect, used to build your
        transactions; (2) the token metadata and image you submit, which is
        pinned publicly to IPFS — treat it as permanent and public; (3)
        standard server logs (IP address, request path) kept briefly for rate
        limiting and abuse prevention.
      </p>
      <h2 className="font-mono text-text">What is public forever</h2>
      <p>
        Everything a launch produces is public blockchain data: the mint, your
        wallet address as creator, escrow, schedule, and the launch
        certificate. That is the product working as intended.
      </p>
      <h2 className="font-mono text-text">Cookies</h2>
      <p>
        None, other than what your wallet extension itself does. Wallet
        auto-connect preference is stored in your browser&apos;s local storage.
      </p>
      <h2 className="font-mono text-text">Contact</h2>
      <p>
        Privacy questions:{" "}
        <a
          href="https://x.com/thawlol"
          className="text-green hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          @thawlol
        </a>{" "}
        on X.
      </p>
    </div>
  );
}
