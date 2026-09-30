# Thaw — the dev bag melts in public

**thawlaunch.lol** is a Pump.fun launchpad where the dev allocation is
**hard-capped and melts linearly from the token's first second — no cliff, no
surprise unlock wall**.

A Thaw launch is one atomic Jito bundle, landing in a single slot:

1. **tx1** — Pump.fun `create_v2` + the creator's (hard-capped) dev buy in one
   transaction: nothing can trade before the dev buy.
2. **tx2** — 100% of the bought tokens are deposited into a
   [Jupiter Lock](https://lock.jup.ag) escrow that releases **linearly from
   t=0 with no cliff** (`cancel_mode = NONE`, `update_recipient_mode = NONE` —
   nobody can cancel, freeze, or accelerate it), followed by a
   [Lighthouse](https://github.com/Jac0xb/lighthouse) assertion that the
   creator's wallet holds **exactly zero** un-escrowed tokens. Plus platform
   fee and Jito tip.
3. **tx3** — a launch certificate is written via the
   [Solana Attestation Service](https://solana.com/docs/tools/attestations),
   recording the cap, the melt rate, and the bundle signature — keyed by mint,
   readable by any bot or terminal.

Because the bundle is all-or-nothing, **the token cannot exist without its
public melt schedule**, and the dev's capped bag can only leave on that slow,
uncancellable drip. Enforcement at launch time, on Pump.fun's own venue — not
post-hoc scanning.

> Sibling product to **SlotZero** (which *locks* the bag behind a cliff and
> proves it). Thaw takes the opposite angle: *no* cliff, a hard size cap, and a
> steady public melt. Same infrastructure, different thesis.

## What makes it unique

- Tokens are **real Pump.fun tokens** — same program
  (`6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P`), same bonding curve, same
  PumpSwap graduation.
- **No custom smart contract.** The launch composes four audited, live
  programs (Pump, Jupiter Lock, Lighthouse, SAS). Our code only builds
  transactions the creator signs in their own wallet.
- **No database.** Launches are enumerated from the on-chain attestations
  under our SAS credential; the verifier recomputes every check against live
  chain state. The public record *is* the record.
- **Public verifier API** for terminals and TG bots:
  `GET /api/verify/<mint>`, `GET /api/launches`.

## Architecture

```
Next.js 15 (App Router, TS, Tailwind 4)
├── app/                  pages: / /launch /launches /t/[mint] /how /terms /privacy
├── app/api/
│   ├── launch/prepare    validate → pin image+metadata to IPFS (Pinata) →
│   │                     build the 3-tx bundle → return unsigned txs + manifest
│   ├── launch/execute    verify returned txs byte-match what we issued →
│   │                     co-sign (mint keypair, platform key) → send Jito bundle
│   ├── launch/status     Jito bundle status polling
│   ├── verify/[mint]     public live verification report (CORS-open)
│   └── launches          chain-derived launch list (CORS-open)
├── lib/server/           chain layer:
│   ├── pump.ts           @pump-fun/pump-sdk create_v2+buy, curve math
│   ├── lock.ts           Jupiter Lock escrow ixs (Anchor + vendored IDL)
│   ├── lighthouse.ts     token-balance assertions (lighthouse-sdk)
│   ├── attest.ts         SAS credential/schema/attestation (sas-lib)
│   ├── jito.ts           bundle assembly/submission/status
│   ├── verify.ts         chain state → verification report
│   └── launch.ts         orchestrator (prepare/execute)
└── scripts/
    ├── gen-key.mjs       generate the platform keypair
    ├── setup-sas.mjs     one-time SAS credential+schema creation
    └── gen-branding.mjs  deterministic pixel-art brand assets
```

Signing model: the creator signs tx1+tx2 via their wallet
(`signAllTransactions`); the server contributes the mint keypair (required
signer of `create_v2`), the ephemeral escrow base key, and the platform key
(tx3). The server **refuses to co-sign** any transaction whose message bytes
differ from what it issued.

The platform key custodies nothing: it issues attestations (paying ~0.003 SOL
rent per launch), receives the flat platform fee, and holds no user funds.

## Local setup

```bash
npm install
cp .env.example .env.local        # fill in values (see below)
node scripts/gen-key.mjs          # → PLATFORM_KEYPAIR for .env.local
npm run dev
```

Set `DRY_RUN=1` to exercise the full pipeline against mainnet state without
spending SOL (transactions are simulated, never sent — no token is created).
With a Helius RPC the dry run uses `simulateBundle` to validate all three
transactions statefully; on RPCs without it, tx1 is simulated alone.

### Environment variables

| Var | Purpose |
|---|---|
| `SOLANA_RPC_URL` | Server-side RPC (Helius recommended; needs `getProgramAccounts`) |
| `PLATFORM_KEYPAIR` | base58 secret key — attestation issuer + fee receiver. Fund with ~0.05 SOL |
| `PINATA_JWT`, `PINATA_GATEWAY` | IPFS pinning for token image + metadata |
| `JITO_BLOCK_ENGINE_URL` | default `https://mainnet.block-engine.jito.wtf` |
| `JITO_TIP_LAMPORTS` | default 1000000 (0.001 SOL) |
| `PLATFORM_FEE_LAMPORTS` | default 20000000 (0.02 SOL) |
| `DRY_RUN` | `1` = simulate only |
| `NEXT_PUBLIC_SITE_URL` | canonical origin |

### One-time chain setup

After funding the platform key:

```bash
SOLANA_RPC_URL=... PLATFORM_KEYPAIR=... node scripts/setup-sas.mjs
```

creates the `Thaw` SAS credential and `ThawLaunchV1` schema
(idempotent).

## Pump.fun integration

Direct on-chain integration via the official `@pump-fun/pump-sdk` v2
(`createV2AndBuyInstructions`) against the published IDLs in
[pump-fun/pump-public-docs](https://github.com/pump-fun/pump-public-docs). No
PumpPortal or reverse-engineered endpoints. New pump mints are Token-2022;
the escrow leg is built Token-2022-native. Metadata is a Metaplex-style JSON
pinned to IPFS (the old `pump.fun/api/ipfs` endpoint is defunct).

Dev-buy token amounts are deterministic because the bundle guarantees the
buy is the curve's first trade — computed with the SDK's own curve math from
the on-chain `Global` + fee config.

## Deployment (Render)

- Build: `npm ci && npm run build` — Start: `npm start`
- Health check: `/api/health`
- Set all env vars in the Render dashboard (never commit them).
- In-memory session/caches are per-instance: run a single instance (the
  free/starter tiers do). Sessions are 10-minute launch flows; loss on deploy
  is harmless (prepare again).

## Domain

`thawlaunch.lol` (Porkbun) → Render custom domain. Apex `thawlaunch.lol` is
canonical; `www` redirects. DNS: apex A/ALIAS per Render's instructions +
`www` CNAME to the service host.

## Troubleshooting

- **`SESSION_NOT_FOUND` on execute** — the 10-minute launch session expired
  or the instance restarted; rebuild the launch (nothing landed on-chain).
- **Bundle `expired`** — didn't land before blockhash expiry (congestion/low
  tip). Atomic: nothing happened; retry, optionally raise `JITO_TIP_LAMPORTS`.
- **`launches` empty** — RPC must support `getProgramAccounts` with memcmp
  filters (public RPC often rejects; use Helius).
- **Attestation tx fails** — platform key unfunded, or `setup-sas.mjs` not
  run yet.
- **Verify page shows WARN on atomicity** — RPC transaction history pruned;
  escrow/certificate checks still authoritative.

## Repository docs

- `docs/research.md` — ecosystem research with sources
- `docs/concepts.md` — the 10 candidate concepts + selection rationale
- `docs/product-spec.md` — full product spec
- `docs/architecture.md` — deeper architecture notes
- `docs/brand.md`, `docs/x-branding.md` — brand system + X package
- `docs/launch-checklist.md` — go-live QA checklist

## Disclaimers

Thaw is not affiliated with Pump.fun. A seal proves the creator's
declared allocation is locked; it does not prevent third-party snipers or
outside-funded wallets, and it is not investment advice. Memecoins are
extremely risky.
