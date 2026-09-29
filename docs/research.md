# Ecosystem Research — September 2026

Research conducted 2026-09-29 across Pump.fun official docs, GitHub, Solana docs, news coverage, and community discussion. Four research tracks: (1) Pump.fun integration surface, (2) competitive landscape, (3) creator/trader pain points, (4) Solana primitives feasibility.

---

## 1. How Pump.fun works today

**Launch flow.** Create coin (mint + bonding-curve init on the Pump program) → constant-product virtual-reserve bonding curve → automatic, atomic graduation to **PumpSwap** (Pump's own AMM — Raydium has not been involved since March 2025). ~1B supply, ~800M sold on the curve, graduation around 85 SOL collected (read exact constants from the on-chain `Global` account).

**Fees.** Creation is **free**. Curve trading: **1.25%** total (0.95% protocol + **0.30% creator**). Graduation: 0.015 SOL. PumpSwap canonical pools: dynamic tiers, 1.25% → 0.30% by market cap; the variable component is the creator fee ("Project Ascend" / Dynamic Fees V1, Sept 2025).

**Creator fee sharing (January 2026).** Creators can split their fee stream across **up to 10 wallets** via `create_fee_sharing_config` / `update_fee_shares_v2`; the config becomes **immutable** after setup (admin auto-revoked). Fee distribution is a permissionless crank. This is the single most important recent primitive for wrapper economics.

**Integration methods** (in order of preference):
- **On-chain program integration** via the official IDLs in [pump-fun/pump-public-docs](https://github.com/pump-fun/pump-public-docs) and the official [`@pump-fun/pump-sdk`](https://www.npmjs.com/package/@pump-fun/pump-sdk) (v2.x, built on `@solana/web3.js` ^1.98 + Anchor 0.31). Program ID: `6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P`. Current instruction family: `create_v2` / `buy_v2` / `sell_v2` (multi-quote-mint capable; mints now initialized under Token-2022).
- PumpSwap AMM: `pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA` ([`@pump-fun/pump-swap-sdk`](https://www.npmjs.com/package/@pump-fun/pump-swap-sdk)).
- **PumpPortal** (third-party API, 0.5–1% per trade) — avoided for core flows; fee stacking and custody concerns.
- The reverse-engineered `frontend-api-v3.pump.fun` — unofficial, Cloudflare-protected; not for launch-critical paths.

**Metadata.** The old `pump.fun/api/ipfs` upload endpoint is dead (since ~Jan 2025). Current practice: pin image + Metaplex-style JSON to IPFS yourself (e.g. Pinata) and pass the `uri` to `create_v2`.

**Two load-bearing technical facts** (from official docs):
1. The `creator` argument to `create_v2` is a **plain Pubkey, not a signer** — it can be any address.
2. The **mint keypair is client-generated** and signs the create transaction — so a wrapper controls the mint address (vanity grinding) and can compose the create instruction with anything else, atomically.

Sources: [pump.fun/docs/bonding-curve](https://pump.fun/docs/bonding-curve) · [pump.fun/docs/fees](https://pump.fun/docs/fees) · [pump-public-docs](https://github.com/pump-fun/pump-public-docs) (COIN_CREATION.md, CREATOR_FEE_SHARING.md, COLLECT_CREATOR_FEE.md) · [The Block on Jan 2026 fee overhaul](https://www.theblock.co/news/markets/2026-01-09-pump-fun-overhauls-creator-fees-token-launches-highest-daily-september-384975) · [Blockworks on Project Ascend](https://blockworks.com/news/pumpdotfun-fee-model) · [pumpportal.fun](https://pumpportal.fun/trading-api/)

---

## 2. Competitive landscape

**Pump.fun** holds ~73–90% of Solana launchpad revenue after fending off three challenger waves. It now natively has: dynamic creator fees, 10-wallet fee splits, livestreaming, mobile app, USDC pairs, PUMP buybacks.

**Challenger pattern** — every challenger that won share did it one of three ways, and pure fee/buyback plays got copied by Pump.fun within weeks:
- Fees to an existing community token — **LetsBonk** (flipped Pump.fun July 2025, collapsed in weeks), **Heaven** (same arc). Mean-reverting.
- Fees to creators by social identity — **Bags** (fee splits to up to 100 X/Kick/GitHub handles, $21M+ paid out; the stickiest differentiator so far), **Believe** (launch-by-tweet; −94% from peak), **Clanker** (Farcaster).
- Novel quote asset / distribution — **Pons** and **StonkFun** (stock-quoted pairs, 2026), **Moonit** (Apple Pay onramp, acquired by Jupiter).

**Anti-sniper prior art exists only on venues that control their own curve**: Jupiter Studio (decaying fee 99%→1%, optional vested creator allocation via its own DBC config), Virtuals Genesis (points-based allocation + refunds), Heaven (high early fee). **Nobody enforces fair-launch mechanics on Pump.fun's own venue.**

**Tooling layer** (bundlers: Vortex, MemeTools, Smithii; vanity grinders; terminals: Axiom ~45–50% of volume) is saturated and — for bundlers — reputationally toxic.

**Gaps nobody covers:** enforcement-grade launch transparency on Pump.fun itself; programmable post-launch obligations (milestone vesting); holder-side anti-rug underwriting; creator-side launch aggregation.

Sources: [CoinDesk on LetsBonk](https://www.coindesk.com/markets/2025/07/08/bonkfun-grabs-55-of-solana-token-issuance-share-pushes-bonk-demand) · [Bags docs](https://docs.bags.fm/changelog/changelog) · [Jupiter Studio](https://docs.jup.ag/user-docs/launch/studio/launching-a-token) · [Virtuals Genesis](https://whitepaper.virtuals.io/about-virtuals/tokenization-platform/genesis-launch/genesis-allocation-mechanics) · [CoinGecko launchpad wars](https://www.coingecko.com/learn/memecoin-launchpad-wars-pumpfun-stonkfun-ponsfamily) · [The Block on Pump dominance](https://www.theblock.co/post/375352/pump-fun-dominates-token-launches-1-million-daily-despite-market-slowdown)

---

## 3. Pain points (what the market actually complains about)

**The central unsolved problem is the launch-trust gap:**

- **>50% of Pump.fun tokens are same-block sniped** before public discovery; ~1.75% of launches are *deployer-funded* sniping operations extracting ~15,000 SOL/month at an 87% win rate (Pine Analytics, ["Exit Liquidity Machines"](https://pineanalytics.substack.com/p/exit-liquidity-machines)).
- Because there is **no legitimate way to secure a creator allocation**, honest creators covertly bundle-buy their own launches — which is exactly what traders read as a rug signal ($MELANIA team sniped its own launch for $2.4M; Libra co-creator called self-sniping standard practice).
- "Dev sell" alerts and bundle scanners (TrenchRadar, GMGN insider %, Bubblemaps, RugCheck) are **post-hoc and lagging** — they fire after bundled wallets have already dumped. Detection lives off-platform; **nothing is enforced at the launchpad level**.
- 98.7% of tokens are flagged pump-and-dumps (Solidus Labs); ~70% of tokens are dead on launch day; graduation rate ~0.6–1.4%.
- Trader reaction to creator-fee increases: "all the incentive goes towards being a rug dev" — fee models reward launching, not sustaining.

**Repeatedly requested features:** transparent creator allocation, verifiable dev vesting (Moonit does 12-month Jupiter Lock vesting on its own venue), anti-sniper mechanics, wallet caps, creator reputation. Caveat from analysts: soft rules migrate bot edge; rules must be **hard** (atomic/on-chain), not heuristic.

Sources: [Pine Analytics](https://pineanalytics.substack.com/p/exit-liquidity-machines) · [Solidus Labs rug report](https://www.soliduslabs.com/reports/solana-rug-pulls-pump-dumps-crypto-compliance) · [Solana Compass on sniping](https://solanacompass.com/learn/Lightspeed/what-weve-learned-from-pumpfuns-sniping-problem) · [CoinGecko token lifespan](https://www.coingecko.com/research/publications/average-lifespan-of-pumpfun-tokens) · [predatory dynamics substack](https://mitchthelawyer.substack.com/p/the-predatory-dynamics-of-memecoin)

---

## 4. Feasible building blocks (all live on mainnet, all audited, no custom program needed)

| Primitive | Role for us |
|---|---|
| `create_v2` + dev-buy in one tx (official SDK) | Impossible to snipe before the dev buy |
| **Jito bundles** (≤5 txs, atomic, one slot, all-or-nothing; 95%+ stake runs Jito) | The whole launch — create, buy, escrow, assert — lands in the token's first slot or not at all |
| **Jupiter Lock** (free, open-source, audited by OtterSec + Sec3) | Dev tokens escrowed with public cliff/linear vesting, visible in explorers |
| **Lighthouse** (`L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95`, audited) | Assertion instructions that abort the bundle if the dev wallet retains unlocked tokens |
| **Pump.fun native fee sharing** (Jan 2026) | Immutable fee split incl. platform share — monetization with zero custom code |
| **Solana Attestation Service** (mainnet since May 2025, Solana Foundation) | Machine-readable "launch certificate" per mint that bots/terminals can query |
| Address Lookup Tables | Needed — create_v2 alone takes 16+ accounts |
| Vanity mint grinding | Mint keypair is client-generated; brandable mint suffixes |

Custom Anchor program (creator = program PDA, conditional fee logic) is a **phase-2** moat — deploy is cheap (~2 SOL) but audit is $15–50k; the MVP needs none of it.

Sources: [docs.jito.wtf](https://docs.jito.wtf/lowlatencytxnsend/) · [Jupiter Lock](https://docs.jup.ag/user-docs/launch/lock) · [Lighthouse](https://github.com/Jac0xb/lighthouse) · [Solana Attestation Service](https://solana.com/docs/tools/attestations) · [Squads v4](https://docs.squads.so/main/basics/security)

---

## 5. Conclusion → product direction

The strongest whitespace at the intersection of all four tracks:

> **The launch-trust gap is enforcement-shaped, and nobody enforces on Pump.fun's own venue.** Every scanner detects after the fact; every fair-launch mechanic lives on a competitor's curve. A wrapper can make claims *structurally true at creation time* — atomic dev-buy + escrowed vesting + immutable fee split + on-chain certificate, all in the token's first slot — which simultaneously solves the #1 creator pain (no legitimate way to hold an allocation) and the #1 trader pain (hidden bundles and instant dumps).

See `concepts.md` for the ten candidate concepts evaluated and the selection rationale.
