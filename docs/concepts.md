# Phase 2 — Concept Generation & Selection

Ten distinct wrapper concepts, evaluated against the research in `research.md`. Scoring dimensions: usefulness, uniqueness, feasibility, simplicity, viral potential, 5-second explainability, Pump.fun integration cleanliness, MVP quality achievable now.

---

## The 10 concepts

### 1. Sealed Launch — provably locked dev bag at slot zero ✅ CHOSEN
- **One sentence:** Launch a Pump.fun token where the creator's allocation is bought and locked into audited on-chain vesting *in the same atomic bundle that creates the token*, so the token provably cannot exist with an unlocked dev bag.
- **What it does:** One Jito bundle: `create_v2` + dev buy → tokens transferred into a Jupiter Lock vesting escrow (public cliff/linear schedule) → Lighthouse assertions abort everything if the dev wallet retains unlocked tokens → immutable Pump fee split → on-chain launch certificate (SAS attestation) any bot/terminal can query.
- **Why use it:** Creators get the allocation they currently take covertly (and get rugged-flagged for), but as a *trust asset*. Traders get a hard guarantee, not a post-hoc scan. Solves the #1 pain on both sides at once.
- **Feasible?** Yes — every component verified live on mainnet; zero custom programs (composes Pump program, Jupiter Lock, Lighthouse, SAS, Jito).
- **Smart contracts needed?** No (phase 2: program-PDA-as-creator for conditional fee logic).
- **Works with Pump.fun today?** Yes — mint keypair is client-generated, creator is a plain pubkey, create+buy is one instruction pair, bundles are standard.
- **Difficulty:** Medium. Transaction engineering (ALTs, bundle assembly, tip strategy) is the hard part; no novel cryptography.
- **Viral/demonstrable:** High — "dev bag locked at slot zero, here's the on-chain proof" is a one-screenshot claim; verification badge is shareable; every launch advertises the platform.
- **Competitors:** Moonit/Jupiter Studio do vesting **on their own curves**; nobody does it on Pump.fun. Bundlers do atomic buys but hide them.
- **Biggest weakness:** Doesn't stop third-party snipers (nobody can without owning the curve — we're honest about this); locked dev bag ≠ no rug via other wallets (mitigated by funding-graph checks in the certificate).

### 2. Milestone Vesting — roadmap-gated unlocks
- **One sentence:** Creator tokens/fees unlock only when on-chain milestones hit (graduation, market-cap tiers, holder count).
- **What/why:** Aligns creator with token success; traders can price the unlock schedule.
- **Feasible?** Partially — Jupiter Lock is time-based only; condition-based unlocks need a custom oracle+escrow program.
- **Contracts?** Yes (audit $20–40k). **Pump-compatible?** Yes. **Difficulty:** High. **Viral:** Medium-high.
- **Competitors:** Believe attempted socially, not mechanically. **Weakness:** oracle/manipulation surface (mcap pumpable at the unlock boundary); slow to demo — value shows weeks after launch.

### 3. Rug Insurance — fee-escrowed buyer protection
- **One sentence:** A slice of creator fees accrues to an insurance pool that refunds early buyers if the token is abandoned pre-graduation.
- **What/why:** Direct answer to "98.7% are pump-and-dumps"; traders buy insured launches preferentially.
- **Feasible?** Mechanically yes; **defining "abandonment" objectively is an adjudication nightmare** and the pool invites claim-farming (launch, abandon, self-refund).
- **Contracts?** Yes, complex. **Difficulty:** Very high. **Viral:** High ("insured memecoins").
- **Competitors:** Virtuals' pre-launch refunds only. **Weakness:** adversarial adjudication; regulatory scent of insurance.

### 4. Holder Dividend Engine — creator fees stream to holders
- **One sentence:** The creator fee stream is routed to the token's top holders instead of the creator.
- **What/why:** Answers "all the incentive goes to the rug dev"; holding earns yield.
- **Feasible?** Yes via program-PDA-as-creator (custom program) — but **Pump.fun shipped native "holder rewards coins" (`is_holder_reward` on `create_v2`)**, so the platform itself just absorbed this.
- **Competitors:** Pump.fun native, Boop, M3M3 (dead meta). **Weakness:** already commoditized; do not build.

### 5. Transparent Team Presale — the legitimized bundle
- **One sentence:** Creators declare a capped multi-wallet team allocation that is escrowed per-recipient with individual vesting, visible before anyone buys.
- **What/why:** Replaces covert bundling (the #2 trader complaint) with declared, locked allocations.
- **Feasible?** Yes — same primitives as #1, N escrows in the bundle (bundle size limits apply: 5 txs).
- **Contracts?** No. **Difficulty:** Medium-high. **Viral:** Medium.
- **Competitors:** Pump.fun's own 17-wallet open bundling (buys are open but **not locked** — our lock is the differentiator). **Weakness:** it's a feature, not a product; strictly a superset of #1's mechanics. → folded into #1's roadmap.

### 6. Creator Passport — on-chain launch reputation
- **One sentence:** A soulbound, SAS-based track record of every launch a wallet has done (graduated? locked? rugged?) that gates access tiers.
- **What/why:** Serial ruggers are the root problem; portable reputation compounds.
- **Feasible?** Yes (SAS + indexer). **Contracts?** No. **Difficulty:** Medium. **Viral:** Medium — value accrues slowly, cold-start problem (empty passports day one).
- **Competitors:** LetsBonk points-gating, gmgn wallet labels. **Weakness:** sybil-trivial (new wallet = clean slate) unless paired with hard mechanics like #1. → natural phase-2 layer on #1's certificate data.

### 7. Conditional Launch — pledge-triggered creation
- **One sentence:** A token only launches when N wallets have pledged SOL into escrow; pledgers get pro-rata first-block allocation, else refunds.
- **What/why:** Kills the "launch to zero interest" problem; fair allocation à la Virtuals Genesis.
- **Feasible?** Yes with custom escrow program; pledge-then-atomic-launch bundle is elegant.
- **Contracts?** Yes. **Difficulty:** High. **Viral:** High.
- **Competitors:** **Virtuals Genesis is exactly this** (points + refunds). **Weakness:** derivative of Genesis; needs liquidity network effects day one; memecoin culture is impulse-driven — waiting windows fight the meta.

### 8. Creator-side Launch Aggregator
- **One sentence:** One launch form that routes your token to the best venue (Pump.fun, Bonk, Bags…) like Axiom aggregates for traders.
- **What/why:** Real gap (nobody does creator-side aggregation).
- **Feasible?** Yes. **Contracts?** No. **Difficulty:** Medium (×N integrations to maintain). **Viral:** Low-medium — routing is invisible plumbing; weak identity.
- **Weakness:** "Where to launch" is a solved social question (Pump.fun ~85%); thin value per launch; contradicts the brief (a Pump.fun wrapper, not a venue-neutral router).

### 9. Stream-to-Earn Fees — engagement-gated creator income
- **One sentence:** Creator fees are claimable only while the creator is verifiably active (livestreaming/posting); lapsed activity redirects fees to holders.
- **What/why:** Fixes the flagged flaw of Pump's livestream meta (price collapses when the stream ends).
- **Feasible?** Off-chain attestation of "active" is oracle-heavy and gameable; custody of the fee stream needs a custom program.
- **Contracts?** Yes. **Difficulty:** High. **Viral:** Medium-high within the streamer niche.
- **Weakness:** niche-bound; soft (heuristic) rule — analysts specifically warn soft rules just migrate the gaming surface.

### 10. Dev Exit Ladder — pre-programmed transparent selling
- **One sentence:** The creator's only path to selling is a pre-declared on-chain drip schedule (e.g. max 0.5%/day via escrow), visible to everyone from launch.
- **What/why:** "When will the dev dump?" becomes a chart, not a fear.
- **Feasible?** Mostly — Jupiter Lock linear vesting approximates it; true "sell-only-via-escrow" needs a custom program to force sales through a TWAP-ish path.
- **Contracts?** For the strong version, yes. **Difficulty:** Medium-high. **Viral:** Medium.
- **Competitors:** none directly. **Weakness:** the weak (lock-based) version ~= #1 with extra framing; the strong version has MEV problems (everyone front-runs the known drip).

---

## Selection

**Chosen: #1 Sealed Launch**, absorbing #5 (multi-recipient locked allocations) and #6 (certificate data becomes reputation) as roadmap phases.

| Criterion | Assessment |
|---|---|
| Usefulness | Solves the top pain on **both** sides of the market simultaneously (creators: legitimate allocation; traders: hard dump protection) |
| Uniqueness | No one enforces launch integrity **on Pump.fun's venue**; scanners detect, we prevent. Verified against the do-not-copy list |
| Feasibility | 100% composable from live, audited mainnet programs; zero custom contracts for MVP |
| Simplicity | "The dev's bag is locked before the token exists" — understood in 5 seconds |
| Viral | Every launch emits a shareable on-chain proof; badge/API lets terminals and TG bots surface "Sealed" launches — built-in distribution |
| Pump.fun fit | Uses only documented instruction surface (`create_v2`, fee sharing) + standard Solana infra |
| MVP now | Yes — transaction engineering, not research |

**The 5-second sentence:** *"This is Pump.fun, except the dev's tokens are provably locked before the token even exists."*

**Why not the runners-up:** #7 (Conditional Launch) is the most interesting alternative but is derivative of Virtuals Genesis, needs day-one network effects, and fights impulse-driven memecoin culture. #2 (Milestone Vesting) is the best phase-2 addition once a custom program is justified, but its value takes weeks to demonstrate and its oracle surface is manipulable. #4 is already absorbed by Pump.fun natively — a warning about building anything Pump can copy in a config flag; #1's defense is that Pump.fun *structurally can't* match it without admitting its own launches are unsafe, and the certificate/reputation layer compounds in our favor.
