# Thaw — Launch Checklist

## Infrastructure
- [ ] Render service live, `GET /api/health` → `{ok:true, configured:true}`
- [ ] `thawlaunch.lol` resolves, HTTPS valid, `www` → apex redirect
- [ ] Helius RPC set (`getProgramAccounts` + `simulateBundle` capable)
- [ ] `PLATFORM_KEYPAIR` set in Render env only; address funded ≥ 0.05 SOL
- [ ] `scripts/setup-sas.mjs` run once (credential + schema on-chain)
- [ ] `PINATA_JWT` + gateway set; test image pin succeeds
- [ ] `DRY_RUN=0` in production

## Product QA
- [ ] Homepage loads; seal demo plays; no console errors (sans extensions)
- [ ] Wallet connect: Phantom, Solflare, Backpack (Wallet Standard)
- [ ] Launch form validation: empty name, bad ticker, oversized image, bad
      URLs, dev buy out of range, vest < 7d
- [ ] Rejected signature → clean return to review, no orphan state
- [ ] Insufficient SOL → clear error naming the shortfall
- [ ] Dry-run launch end-to-end (simulated) passes
- [ ] REAL launch: token live on pump.fun, escrow visible on lock.jup.ag,
      certificate page all-green, `api/verify/<mint>` correct
- [ ] Duplicate execute + refresh mid-flow behave (idempotent / resumable)
- [ ] Mobile (iPhone + Android widths): no horizontal scroll, forms usable
- [ ] `/launches` shows the launch (chain-derived)

## Brand/social
- [ ] `public/branding/pfp.png`, `banner.png`, `og.png` final
- [ ] Favicon renders (app/icon.png)
- [ ] OG/Twitter card previews correct (test with an X post preview)
- [ ] X account created, PFP + banner uploaded, bio set (docs/x-branding.md)
- [ ] Launch tweet + thread queued
- [ ] $SLOT0 coin name/ticker finalized; dogfood launch planned through the
      product itself (Diamond seal)

## Security
- [ ] No secrets in repo (`git grep` for keys), `.env*` ignored
- [ ] All API inputs zod-validated; image magic-byte sniffed
- [ ] Execute path refuses tampered transactions (message byte-check)
- [ ] Rate limits active on prepare/execute/verify
- [ ] Security headers present (nosniff, frame DENY, referrer policy)
- [ ] Platform key holds only working-capital SOL

## Copy
- [ ] No placeholder text or lorem ipsum anywhere
- [ ] Guarantees vs non-guarantees stated on / , /how, /t pages, terms
- [ ] Terms + privacy reviewed
