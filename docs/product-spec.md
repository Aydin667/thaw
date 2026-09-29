# Thaw — Product Specification

## Concept

**Thaw is a Pump.fun launchpad where the creator's allocation is provably locked before the token exists.**

A launch on Thaw is one atomic Jito bundle, landing in a single slot — the token's *slot zero*:

1. Token created on Pump.fun (`create_v2`) — real Pump.fun token, curve, and PumpSwap graduation.
2. Creator's dev buy executes in the same transaction as creation — nothing can trade before it.
3. The bought tokens are immediately deposited into a **Jupiter Lock** vesting escrow (audited, open-source, publicly visible) with the schedule the creator declared.
4. A **Lighthouse** assertion aborts the entire bundle if the creator's wallet retains more than a dust amount of unlocked tokens.
5. A **launch certificate** (Solana Attestation Service) is written on-chain recording the seal: dev-buy size, escrow address, vesting schedule, bundle signature.

Because the bundle is all-or-nothing, the claim is structural: **the token cannot exist in a state where the dev holds an unlocked bag.** No scanning, no trust in us — anyone can verify the escrow and certificate on-chain.

**The 5-second pitch:** "This is Pump.fun, except the dev's tokens are locked before the token even exists."

## Target customer & problem

- **Creators** who intend to run a token for weeks, not minutes. Today their only way to hold an allocation is covert bundling — which gets them flagged as ruggers by every scanner. Problem: *no legitimate way to hold a creator allocation.*
- **Traders** who filter launches by risk. Today bundle scanners and dev-sell alerts fire *after* the dump. Problem: *trust signals are post-hoc; nothing is enforced at launch.*

## Solution mechanics

### Seal parameters (creator-chosen at launch)
- **Dev buy**: SOL amount (min 0.1, max 10 for MVP) — becomes the locked allocation.
- **Vesting schedule** (Jupiter Lock): cliff date + linear duration. Presets: `Diamond` (30d cliff + 90d linear), `Standard` (14d cliff + 60d linear), `Sprint` (7d cliff + 30d linear), or custom (min total 7 days — below that a seal is meaningless).
- Recipient of the vested tokens = creator wallet (MVP). Multi-recipient team allocations = roadmap.

### Trust guarantees, stated precisely (and on the site)
- ✅ Guaranteed: dev allocation locked from slot zero; unlock schedule public and immutable; dev buy executes before any other trade; certificate is machine-verifiable.
- ❌ Not guaranteed (we say so explicitly): third-party snipers can still buy early (no venue can prevent this without owning the curve); a malicious creator could fund separate wallets (visible to funding-graph scanners — certificate includes the creator wallet for exactly this analysis).

## Flows

### Creator flow
1. Connect wallet → fill launch form (name, ticker, description, image, website/X/Telegram) + Seal settings.
2. Review screen: exact cost breakdown (dev buy + rent ~0.003 + Jito tip + platform fee 0.02 SOL + network fees), what each transaction does, vesting chart.
3. Sign (one `signAllTransactions` prompt). Backend co-signs (mint keypair, platform attestation key), submits bundle to Jito, streams status.
4. Success screen: mint address, Pump.fun link, Solscan link, escrow (lock.jup.ag) link, certificate page link, share-to-X button with pre-filled proof tweet.

### Trader flow
1. Land on a certificate page `/t/<mint>` (linked from the creator's tweet or the launches list).
2. See live verification: each claim checked against chain state *in real time* (escrow balance, schedule, bundle sig) — not a cached badge.
3. Buy on Pump.fun via the outbound link (we are not a trading venue in MVP).

### Wallet flow
- Wallet Standard + wallet-adapter (Phantom, Solflare, Backpack). Never request seed phrases/private keys. All user signatures via wallet `signAllTransactions`. Clear signing preview of every transaction before prompt.

## Token lifecycle
Launch (sealed, slot 0) → bonding curve trading on Pump.fun (0.30% creator fee accrues) → graduation to PumpSwap at ~85 SOL (automatic, Pump-native) → vesting cliff passes → linear unlock → escrow empties; certificate remains as historical record. Thaw's involvement after launch is read-only (verification); we never custody user funds or tokens (escrow is Jupiter Lock's program, recipient is the creator).

## Architecture

```
Next.js 15 (App Router, TypeScript, Tailwind)
├── Frontend (React 19, wallet-adapter, custom terminal UI system)
├── API routes (Node runtime)
│   ├── POST /api/launch/prepare   — validate form → pin image+metadata to IPFS →
│   │                                 grind/derive mint keypair → build unsigned txs
│   │                                 (create+buy, escrow+assert+fee+tip) → return
│   │                                 base64 txs + human-readable tx manifest
│   ├── POST /api/launch/execute   — receive user-signed txs → verify no tampering →
│   │                                 co-sign (mint, platform key) → attach attestation tx →
│   │                                 send Jito bundle → return bundleId
│   ├── GET  /api/launch/status    — poll Jito bundle status + chain confirmation
│   ├── GET  /api/verify/[mint]    — public JSON verification (for bots/terminals)
│   └── GET  /api/launches         — recent sealed launches (chain-derived cache)
└── Chain layer (server-side lib)
    ├── pump.ts        — create_v2/buy via @pump-fun/pump-sdk, curve math
    ├── lock.ts        — Jupiter Lock escrow creation ixs
    ├── lighthouse.ts  — assertion ixs
    ├── attest.ts      — SAS credential/schema/attestation
    ├── jito.ts        — bundle assembly, tip, submission, status
    └── verify.ts      — on-chain state → verification report
```

**No database.** Source of truth is the chain: launches are enumerated from our SAS credential's attestations (`getProgramAccounts` on the SAS program via Helius), verification reads live accounts. Server keeps an in-memory TTL cache. This is deliberate: the platform's own data layer is verifiable by anyone.

**Signing model:**
- User signs: create+buy tx, escrow/platform-fee tx (their SOL/tokens).
- Server signs: mint keypair (create requires it), platform key (attestation tx, pays its own fee).
- Server MUST re-validate user-returned transactions byte-for-byte against what it issued (only signatures may differ) — prevents tampered instructions being co-signed.

## Smart contracts
None custom in MVP. Composed programs (all live, audited): Pump `6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P`, PumpSwap `pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA`, Jupiter Lock, Lighthouse `L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95`, SAS, Jito tip accounts. Program IDs pinned in one config module, verified at startup against known values. Phase 2: tiny Anchor program (creator = program PDA) for conditional fee streaming — requires audit before mainnet.

## Security model
- No custody: platform key holds no user funds; it only issues attestations and co-signs the mint (mint authority passes to Pump's PDA at creation).
- Platform hot key risk limited to: attestation spoofing (mitigated: verification is against real escrow accounts, not just the attestation) and its own SOL balance.
- Secrets (`PLATFORM_KEYPAIR`, `PINATA_JWT`, `HELIUS_API_KEY`) server-side env only; `.env.example` documents all; nothing in client bundles (enforced: no `NEXT_PUBLIC_` secrets).
- Input validation: zod schemas on every route; image: type/size sniffing (≤4.3MB, png/jpg/gif/webp), re-encoded server-side; URLs: https-only, hostname allowlist patterns for socials; ticker: 1–10 chars alphanumeric; name ≤32 chars (metaplex limits).
- Rate limits: per-IP sliding window on prepare/execute; mint grinding capped (worker + timeout).
- XSS: all user metadata rendered as text (React default escaping), no `dangerouslySetInnerHTML` with user data; images proxied/validated.
- Replay: prepare returns a one-time launch session id; execute consumes it; re-execution of the same signed bundle is idempotent (same signature).
- RPC URLs server-side; client gets only public endpoints.

## Failure cases
| Failure | Handling |
|---|---|
| Bundle doesn't land (tip too low / congestion) | Status → `expired` after blockhash expiry; nothing on chain changed (atomic); offer one-click rebuild+retry with higher tip |
| Wallet rejects signing | Clean reset to review screen |
| Insufficient SOL | Pre-checked at prepare (balance ≥ total cost + buffer); clear error with exact shortfall |
| IPFS pin fails | Prepare fails fast; retry safe (no chain state) |
| Mint address collision/reuse | Fresh keypair per session; execute validates mint not already on chain |
| Ticker already exists on Pump.fun | Allowed (Pump allows dupes) but we warn via curve lookup |
| Partial bundle land | Impossible by construction (Jito atomicity); status checker still verifies all 3 txs share one slot |
| Jito endpoint down | Failover across regional block engines |
| User refreshes mid-flow | Launch session persisted in localStorage; status resumable by bundle id |

## Routes

**Frontend:** `/` (landing + interactive seal demo), `/launch` (form → review → sign → status), `/t/[mint]` (live certificate), `/launches` (recent sealed launches), `/how` (technology explainer), `/terms`, `/privacy`.

**API:** as in architecture diagram. All JSON, zod-validated, typed responses, consistent error envelope `{error: {code, message}}`.

## Analytics/events
Privacy-light server-side counters only (launch_prepared, launch_landed, verify_hit); no third-party trackers in MVP.

## Transaction cost display (always shown before signing)
dev buy X SOL + platform fee 0.02 SOL + Jito tip (dynamic, ~0.001–0.005) + rent+fees ≈0.004 SOL → total, with SOL and ≈USD.

## MVP cutlines
IN: sealed launch pipeline, certificate + verify API, launches list, landing, terminal UI, mainnet + dry-run simulation mode.
OUT (documented roadmap): multi-recipient team seals, Pump fee-share integration (platform revenue via `update_fee_shares_v2`), creator passport/reputation, in-app trading, custom program for conditional fees.
