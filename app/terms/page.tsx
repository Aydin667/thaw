import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 space-y-6 text-sm text-muted leading-relaxed">
      <h1 className="font-pixel text-2xl text-text">
        <span className="text-green">&gt;</span> TERMS OF USE
      </h1>
      <p className="font-mono text-xs">Last updated: September 29, 2026</p>
      <p>
        Thaw (&ldquo;the service&rdquo;) is a non-custodial interface that
        builds Solana transactions which you review and sign in your own
        wallet. By using the service you agree to these terms.
      </p>
      <h2 className="font-mono text-text">1. What the service does</h2>
      <p>
        The service composes transactions against third-party on-chain
        programs (Pump.fun, Jupiter Lock, Lighthouse, the Solana Attestation
        Service). Thaw never takes custody of your funds or tokens, never
        holds your private keys, and cannot cancel, modify, or reverse a
        vesting escrow once created. Escrows are uncancellable by design.
      </p>
      <h2 className="font-mono text-text">2. No financial advice, no guarantees of value</h2>
      <p>
        Tokens launched through the service are memecoins with no intrinsic
        value. A &ldquo;seal&rdquo; verifies that a creator&apos;s declared
        allocation is locked in an on-chain escrow — it is not an endorsement,
        an audit of the creator, or any statement about future value. You can
        lose everything you spend. Nothing here is investment advice.
      </p>
      <h2 className="font-mono text-text">3. What a seal does not cover</h2>
      <p>
        A seal cannot prevent third parties (including parties secretly
        related to a creator) from buying or selling a token, cannot prevent
        market manipulation, and does not verify identity. Verification
        reports describe on-chain state at the moment of the check.
      </p>
      <h2 className="font-mono text-text">4. Fees and irreversibility</h2>
      <p>
        The service charges a flat platform fee displayed before you sign.
        Solana transactions are irreversible. Locked tokens unlock only per
        the schedule you chose; Thaw cannot accelerate them for you under
        any circumstances.
      </p>
      <h2 className="font-mono text-text">5. Eligibility and compliance</h2>
      <p>
        You are responsible for compliance with the laws of your jurisdiction,
        including any restrictions on the use of digital assets. The service
        is provided &ldquo;as is&rdquo; without warranties; to the maximum
        extent permitted by law, Thaw&apos;s liability is limited to the
        platform fees you paid in the 30 days before a claim.
      </p>
      <h2 className="font-mono text-text">6. Third-party programs</h2>
      <p>
        Pump.fun, Jupiter Lock, Lighthouse, and the Solana Attestation Service
        are independent programs not operated by Thaw. Their behavior may
        change; on-chain risk (including program bugs) is inherent to using
        Solana.
      </p>
      <h2 className="font-mono text-text">7. Contact</h2>
      <p>
        Questions: reach us on X{" "}
        <a
          href="https://x.com/thawlol"
          className="text-green hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          @thawlol
        </a>
        .
      </p>
    </div>
  );
}
