/**
 * Program IDs and protocol constants. Everything here is public information;
 * secrets live only in environment variables read by lib/server/env.ts.
 */

// Pump.fun bonding curve program (verified against pump-public-docs, Sept 2026)
export const PUMP_PROGRAM_ID = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
// PumpSwap AMM (graduation target)
export const PUMP_AMM_PROGRAM_ID = "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA";
// Jupiter Lock (locker) — open-source, audited by OtterSec + Sec3
export const LOCKER_PROGRAM_ID = "LocpQgucEQHbqNABEYvBvwoxCPsSbG91A1QaQhQQqjn";
// Lighthouse assertion program — audited by OtterSec
export const LIGHTHOUSE_PROGRAM_ID = "L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95";
// Solana Attestation Service (Solana Foundation)
export const SAS_PROGRAM_ID = "22zoJMtdu4tQc2PzL74ZUT7FrwgB1Udec8DdW4yw4BdG";

// SAS registry naming (deterministic PDAs from the platform authority)
export const SAS_CREDENTIAL_NAME = "Thaw";
export const SAS_SCHEMA_NAME = "ThawLaunchV1";
export const SAS_SCHEMA_VERSION = 1;

// Launch constraints.
// Thaw enforces a HARD CAP on the dev buy — the whole point is that no launch
// carries an oversized dev bag. 0.05–5 SOL keeps the dev's share modest
// (roughly ≤ ~15% of supply at the top of the range on a fresh curve).
export const MIN_DEV_BUY_SOL = 0.05;
export const MAX_DEV_BUY_SOL = 5;
// Thaw has NO cliff. These bound the linear thaw (emission) duration.
export const MIN_TOTAL_VEST_DAYS = 3;
export const MAX_TOTAL_VEST_DAYS = 365;

// Unlock granularity for linear vesting (seconds)
export const VEST_PERIOD_SECONDS = 3600;

export interface SealPreset {
  id: string;
  label: string;
  // Thaw presets always have cliffDays = 0 (thaw begins at slot zero).
  cliffDays: number;
  linearDays: number;
  blurb: string;
}

// Thaw presets: emission speeds, no cliff. The bag melts from second zero.
export const SEAL_PRESETS: SealPreset[] = [
  {
    id: "fast",
    label: "Fast melt",
    cliffDays: 0,
    linearDays: 14,
    blurb: "no cliff · fully thawed in 14 days",
  },
  {
    id: "steady",
    label: "Steady",
    cliffDays: 0,
    linearDays: 45,
    blurb: "no cliff · fully thawed in 45 days",
  },
  {
    id: "glacial",
    label: "Glacial",
    cliffDays: 0,
    linearDays: 90,
    blurb: "no cliff · fully thawed in 90 days",
  },
];

// Jito tip accounts (public, from Jito docs)
export const JITO_TIP_ACCOUNTS = [
  "96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5",
  "HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe",
  "Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY",
  "ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49",
  "DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh",
  "ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt",
  "DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL",
  "3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT",
];

export const SITE_NAME = "Thaw";
export const SITE_TAGLINE = "The dev bag melts in public.";
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://thaw.lol";
