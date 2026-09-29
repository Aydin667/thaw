# Thaw — Architecture Notes

## Trust model (read this first)

The product's only promise: **a sealed token cannot exist with an unlocked
creator allocation.** The promise is enforced by transaction structure, not
by Thaw's honesty:

1. **Atomicity** — the three transactions are a Jito bundle: same slot, in
   order, all-or-nothing. There is no partial state.
2. **The dev buy is unsnipeable** — it shares a transaction with `create_v2`.
3. **The lock is real and third-party** — Jupiter Lock escrow (audited,
   open-source), `cancel_mode = 0`, `update_recipient_mode = 0`. Thaw has
   no authority over it after creation.
4. **The zero-balance assertion** — Lighthouse `assertTokenAccount(amount ==
   0)` on the creator's ATA, placed after the escrow deposit in tx2. If the
   deposit is short by one raw unit, tx2 fails, and the bundle — including
   token creation — never lands.
5. **The certificate is a summary, not the proof** — SAS attestations are
   convenient for indexing (deterministic address from mint), but every claim
   is independently checkable against the escrow account and the bundle
   signature. A malicious Thaw could at worst *fail to issue* a
   certificate; it could not fake a lock.

What is intentionally NOT claimed: protection from third-party snipers, or
from creators funding unrelated wallets. Both are stated on the site.

## The bundle in detail

| tx | signers | instructions |
|---|---|---|
| 1 | creator wallet, mint keypair (server-held, discarded after) | computeBudget · `create_v2` · createATA · `buy` |
| 2 | creator wallet, ephemeral escrow base (server-held, discarded) | computeBudget · createEscrowATA · `create_vesting_escrow_v2` · `create_vesting_escrow_metadata` · Lighthouse assert · platform fee transfer · Jito tip |
| 3 | platform key | computeBudget · SAS `create_attestation` |

- All three share one recent blockhash (prepare-time); execute must happen
  within the blockhash window (~60–90s) or the bundle expires harmlessly.
- tx3 is rebuilt server-side at execute time so the attestation can embed
  tx1's signature (`launch_sig`) — the user signs nothing in tx3, so the
  rebuild is safe.
- Escrow math: `total = cliff_unlock + amount_per_period × number_of_period`
  with hourly periods; `cliff_unlock` carries the division remainder so the
  sum equals the dev-buy amount **exactly** (required by the Lighthouse
  zero-balance assertion).

## Determinism

The dev buy is the first trade on a fresh curve, so the token amount is
computable at prepare time from the pump `Global` account + fee config using
the SDK's own math (`getBuyTokenAmountFromSolAmount` with
`bondingCurve: null`). This exact figure is what gets escrowed and asserted.

## Session integrity (server)

`prepare` stores the issued unsigned transactions; `execute` requires the
wallet-returned transactions to have **byte-identical messages** (only
signatures may differ) before the server contributes its signatures. This
prevents a malicious client from getting the mint keypair's signature onto
arbitrary instructions. Sessions live 10 minutes, in memory, keyed by a
random 128-bit id, single-use.

## SAS schema (SealedLaunchV1)

Layout codes: `[12,12,12,3,3,8,8,12,12,8]` →

| field | type |
|---|---|
| mint | String (base58) |
| creator | String |
| escrow | String |
| dev_buy_lamports | u64 |
| tokens_locked | u64 (raw, 6 dp) |
| cliff_ts | i64 |
| vest_end_ts | i64 |
| schedule | String (human) |
| launch_sig | String |
| launched_at | i64 |

Attestation PDA = f(credential, schema, nonce=mint) — anyone can derive a
certificate address from a mint with no index.

## No-database design

- `/api/launches`: `getProgramAccounts` on the SAS program filtered by
  credential (offset 33) + schema (offset 65), decoded with the fixed schema,
  30s in-memory cache.
- `/api/verify/[mint]`: live reads of the attestation, escrow account, escrow
  token balance, mint metadata (Token-2022 extension), and slot comparison of
  the launch tx vs. the attestation tx. 15s cache.
- Consequence: anyone can rebuild our entire "backend state" from public
  chain data — which is the point.

## Failure/edge handling

- Bundle not landed by blockhash expiry → `expired`; UI offers rebuild.
  Nothing on-chain changed.
- Instance restart mid-flow → session gone → `SESSION_NOT_FOUND`; rebuild.
- Jito flagship endpoint down → (roadmap) regional failover list; currently
  surfaced as a clean submission error, retry-safe.
- RPC history pruned → atomicity check degrades to WARN; account-state checks
  (escrow, certificate) remain authoritative.
- Duplicate execute for a consumed session → returns the original bundle id
  (idempotent).

## Known limits / roadmap

- **Bundle simulation in dry-run** needs an RPC with `simulateBundle`
  (Helius); otherwise only tx1 is statefully simulated.
- **tx2 size** is close to the 1232-byte v0 limit; if a future pump/locker
  change adds accounts, introduce a pre-created Address Lookup Table.
- **Phase 2 (requires a small audited Anchor program):** program-PDA-as-
  creator fee routing (conditional creator-fee streaming, milestone unlocks),
  multi-recipient team seals, creator reputation passport built from
  certificate history, Pump native fee-share integration
  (`update_fee_shares_v2`) for revenue instead of the flat fee.
