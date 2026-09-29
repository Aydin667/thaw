# Thaw — X Brand Package

## Display name
**Thaw**

## Suggested @username options
1. `@thawdotlol`
2. `@thawlaunch`
3. `@thaw_fun`
4. `@thawpump`
5. `@meltinpublic`

(Check availability at registration; prefer 1, falling back in order.)

## Bio (≤160 chars)
> Pump.fun launches where the dev bag is capped and melts on a public schedule from second zero. No cliff, no unlock walls. Verify any melt on-chain. thaw.lol

## Profile
- PFP: `/public/branding/pfp.png` (icy melting-ice mark)
- Banner: `/public/branding/banner.png`
- Pinned: launch tweet below.

---

## Launch tweet (main)

> every vesting schedule has the same trap door: the cliff.
>
> the dev bag sits frozen for weeks, then one unlock date arrives and the whole thing dumps at once. "vested" and "safe" are not the same word.
>
> Thaw removes the trap door. launches here have a hard-capped dev buy that melts linearly from the token's very first second — no cliff, no unlock wall, ever. the exact melt rate is written on-chain in the same atomic bundle that creates the token.
>
> it's a real pump.fun token: same curve, same graduation. the only difference is you can see precisely how much the dev can sell, and how slowly, from second zero — and it can't be sped up by anyone.
>
> thaw.lol

## Short launch tweet

> pump.fun launches where the dev bag melts in public — capped, no cliff, linear from second zero.
>
> the whole sell schedule is on-chain before anyone buys.
>
> thaw.lol

## Technical launch tweet

> how Thaw works, in one Jito bundle (≤5 txs, one slot, atomic):
>
> tx1: pump.fun create_v2 + a hard-capped dev buy — nothing trades before it
> tx2: 100% of the dev buy → Jupiter Lock escrow that releases linearly from t=0, no cliff; cancel/update modes NONE (can't be frozen, cancelled, or accelerated) + a Lighthouse assert that the dev wallet keeps 0 un-escrowed tokens, else the bundle reverts
> tx3: an on-chain certificate (SAS) recording the cap, the melt rate, and the bundle sig
>
> the token cannot exist without its public melt schedule. verify any mint: thaw.lol/api/verify/<mint>

## Follow-up tweets (5)

1. > cliffs exist to help devs, not holders. a cliff is just a countdown to a dump you agreed to ignore.
   > Thaw has no cliffs. the bag is always melting, always visible, from block one.

2. > two numbers decide whether a dev bag is dangerous: how big, and how fast it can leave.
   > Thaw caps the first and publishes the second, on-chain, before you buy.

3. > "dev sold" alerts are a smoke detector that goes off after the house burns down.
   > Thaw shows you the exact burn rate in advance — how many tokens can leave per hour, forever.

4. > every Thaw launch is public JSON: GET thaw.lol/api/verify/<mint>
   > returns the cap, the melt rate, and how much is still frozen right now. terminals + TG bots: plug it in.

5. > it's the same pump.fun token underneath — same bonding curve, same PumpSwap graduation. Thaw just makes the dev's exit a slow, public, uncancellable drip instead of a surprise.

## Thread — how the technology works

> 1/ Thaw in one sentence: pump.fun launches where the dev bag is capped and melts on a public, uncancellable schedule from the token's first second. no cliff. here's the whole machine 🧵

> 2/ the problem isn't vesting, it's the cliff. lock a bag for 30 days and you haven't made it safe — you've scheduled the dump. the moment the cliff passes, the entire allocation is liquid at once.

> 3/ the other half is size. an uncapped dev buy makes the creator the biggest holder with the least to lose. Thaw hard-caps the dev buy at build time so the bag is modest by construction.

> 4/ a Thaw launch is one Jito bundle — up to 5 txs that land in the same slot or not at all. tx1: pump.fun create_v2 + the capped dev buy, same transaction, so nothing can trade before it.

> 5/ tx2: 100% of that dev buy goes into a Jupiter Lock escrow (open-source, audited by OtterSec + Sec3) that releases linearly starting at t=0 — no cliff. cancel_mode and update_recipient_mode are NONE: nobody, not even us, can cancel, freeze, or accelerate it.

> 6/ same tx2: a Lighthouse assertion requires the dev wallet to end the bundle holding zero un-escrowed tokens. off by a lamport and the whole bundle — token creation included — reverts.

> 7/ tx3: an on-chain certificate via Solana Attestation Service records the cap, the escrow, the melt rate, and the launch signature. any bot can read it from the mint address alone.

> 8/ so "the dev can only sell slowly and in public" isn't a promise — it's how the token was born. verify it yourself from the bundle signature, no trust required.

> 9/ what Thaw doesn't do: stop third-party snipers (no venue can without owning the curve), or stop someone funding fresh wallets — that stays visible to funding-graph scanners. it fixes the dev bag, not the whole market.

> 10/ normal pump.fun token, normal curve, normal graduation. one difference: the dev's exit is a slow public drip anyone can watch, from second zero. launch: thaw.lol

## Content rules
- No rocket/fire emoji clusters, no "revolutionary/game-changing".
- Every claim must be verifiable from the certificate; if it isn't, don't post it.
- Always link certificates, not screenshots alone.

## Relationship to SlotZero (internal note)
Thaw and SlotZero are sibling launchpads on the same infrastructure. SlotZero *locks* the dev bag behind a cliff and proves it's locked; Thaw *removes* the cliff and makes the bag melt slowly in public with a hard cap. Different thesis, different audience (SlotZero = "prove it's held"; Thaw = "no surprise unlocks, capped size"). Don't cross-brand them in public copy.
