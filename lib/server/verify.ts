import "server-only";
/**
 * Live verification. Every check reads current chain state — the report is
 * recomputed on demand, never cached as a badge. This module is also the
 * backing for the public /api/verify/[mint] endpoint that bots consume.
 */
import { PublicKey } from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  getTokenMetadata,
} from "@solana/spl-token";
import BN from "bn.js";
import type { CheckResult, VerificationReport } from "@/lib/types";
import { getConnection } from "./rpc";
import { getPlatformKeypair } from "./env";
import { deriveAttestationAddress, deserializeSealData } from "./attest";
import { fetchEscrowState } from "./lock";

const CACHE_TTL_MS = 15_000;
const cache = new Map<string, { report: VerificationReport; at: number }>();

export async function verifyMint(mintStr: string): Promise<VerificationReport> {
  const cached = cache.get(mintStr);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.report;

  const report = await buildReport(mintStr);
  cache.set(mintStr, { report, at: Date.now() });
  if (cache.size > 500) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].at - b[1].at)[0];
    if (oldest) cache.delete(oldest[0]);
  }
  return report;
}

async function buildReport(mintStr: string): Promise<VerificationReport> {
  const connection = getConnection();
  const mint = new PublicKey(mintStr);
  const platform = getPlatformKeypair().publicKey;
  const checks: CheckResult[] = [];

  const base: VerificationReport = {
    mint: mintStr,
    sealed: false,
    checkedAt: Date.now(),
    checks,
    links: {
      pumpFun: `https://pump.fun/coin/${mintStr}`,
      solscan: `https://solscan.io/token/${mintStr}`,
    },
  };

  // 1. Certificate exists
  const attestationAddr = await deriveAttestationAddress(platform, mint);
  const attInfo = await connection.getAccountInfo(attestationAddr);
  if (!attInfo) {
    checks.push({
      id: "certificate",
      label: "Thaw launch certificate",
      status: "fail",
      detail: "No Thaw certificate exists for this mint. This token was not launched through Thaw.",
    });
    return base;
  }

  // Attestation account: disc(1) + nonce(32) + credential(32) + schema(32) + vec<data>
  const attData = attInfo.data;
  const dataLen = attData.readUInt32LE(97);
  const sealRaw = attData.subarray(101, 101 + dataLen);
  const seal = await deserializeSealData(new Uint8Array(sealRaw));
  if (!seal || seal.mint !== mintStr) {
    checks.push({
      id: "certificate",
      label: "Thaw launch certificate",
      status: "fail",
      detail: "Certificate exists but could not be decoded or does not match this mint.",
    });
    return base;
  }

  base.attestation = attestationAddr.toBase58();
  base.creator = seal.creator;
  base.devBuySol = Number(seal.dev_buy_lamports) / 1e9;
  base.lockedTokensRaw = seal.tokens_locked.toString();
  base.escrow = seal.escrow;
  base.cliffTs = Number(seal.cliff_ts);
  base.vestEndTs = Number(seal.vest_end_ts);
  base.bundleSignature = seal.launch_sig;
  base.links.attestation = `https://solscan.io/account/${attestationAddr.toBase58()}`;
  base.links.escrow = `https://lock.jup.ag/escrow/${seal.escrow}`;

  checks.push({
    id: "certificate",
    label: "Thaw launch certificate",
    status: "ok",
    detail: `Certificate on-chain at ${short(attestationAddr.toBase58())}, issued by the Thaw attestation authority.`,
    link: base.links.attestation,
  });

  // 2. Escrow exists and is immutable
  const escrowPk = new PublicKey(seal.escrow);
  const escrowState = await fetchEscrowState(escrowPk);
  if (!escrowState) {
    checks.push({
      id: "escrow",
      label: "Vesting escrow (Jupiter Lock)",
      status: "fail",
      detail: "The escrow named in the certificate does not exist on-chain.",
    });
    return base;
  }

  const escrowOk =
    escrowState.tokenMint.equals(mint) &&
    escrowState.recipient.toBase58() === seal.creator;
  checks.push({
    id: "escrow",
    label: "Vesting escrow (Jupiter Lock)",
    status: escrowOk ? "ok" : "fail",
    detail: escrowOk
      ? `Escrow ${short(seal.escrow)} holds the creator allocation for this mint; recipient is the creator wallet.`
      : "Escrow exists but its mint/recipient do not match the certificate.",
    link: base.links.escrow,
  });

  const immutable =
    escrowState.cancelMode === 0 && escrowState.updateRecipientMode === 0;
  checks.push({
    id: "immutable",
    label: "Melt schedule is locked in",
    status: immutable ? "ok" : "fail",
    detail: immutable
      ? "cancel_mode = NONE and update_recipient_mode = NONE — nobody, including Thaw, can cancel the melt, freeze it, or speed it up."
      : `Escrow modes are not NONE (cancel=${escrowState.cancelMode}, update=${escrowState.updateRecipientMode}).`,
  });

  // 3. Deposited amount matches the certificate
  const depositMatches =
    escrowState.totalDeposited.eq(new BN(seal.tokens_locked.toString()));
  checks.push({
    id: "amount",
    label: "100% of dev buy on the melt schedule",
    status: depositMatches ? "ok" : "fail",
    detail: depositMatches
      ? `${fmtTokens(seal.tokens_locked)} tokens (the entire dev buy) were deposited at launch.`
      : "Escrow deposit does not match the certified amount.",
  });

  // 4. Schedule matches
  const schedOk =
    escrowState.cliffTime === Number(seal.cliff_ts) &&
    escrowState.cliffTime +
      escrowState.numberOfPeriod * escrowState.frequency <=
      Number(seal.vest_end_ts) + escrowState.frequency;
  checks.push({
    id: "schedule",
    label: "Thaw schedule",
    status: schedOk ? "ok" : "fail",
    detail: schedOk
      ? `${seal.schedule}; melting since launch, fully thawed ${fmtDate(Number(seal.vest_end_ts))}.`
      : "On-chain schedule differs from the certificate.",
  });

  // 5. Current lock balance (live)
  const remaining = escrowState.totalDeposited.sub(escrowState.totalClaimed);
  base.withdrawnRaw = escrowState.totalClaimed.toString();
  base.remainingLockedRaw = remaining.toString();
  checks.push({
    id: "balance",
    label: "Live frozen balance",
    status: "ok",
    detail: `${fmtTokens(BigInt(remaining.toString()))} tokens still frozen in escrow; ${fmtTokens(BigInt(escrowState.totalClaimed.toString()))} melted and claimable/claimed so far per the public schedule.`,
  });

  // 6. Atomicity: certificate + launch landed in the same slot
  if (seal.launch_sig) {
    try {
      const [launchTx, attSigs] = await Promise.all([
        connection.getTransaction(seal.launch_sig, {
          maxSupportedTransactionVersion: 0,
          commitment: "confirmed",
        }),
        connection.getSignaturesForAddress(attestationAddr, { limit: 1 }),
      ]);
      const launchSlot = launchTx?.slot;
      const attSlot = attSigs[0]?.slot;
      base.launchSlot = launchSlot;
      const atomic = Boolean(launchSlot && attSlot && launchSlot === attSlot);
      checks.push({
        id: "atomic",
        label: "Melting from slot zero",
        status: atomic ? "ok" : "warn",
        detail: atomic
          ? `Token creation, dev buy, escrow deposit and certificate all landed in slot ${launchSlot} — the token never existed without its melt schedule.`
          : "Could not confirm same-slot atomicity from RPC history (old transactions may be pruned).",
        link: `https://solscan.io/tx/${seal.launch_sig}`,
      });
    } catch {
      checks.push({
        id: "atomic",
        label: "Melting from slot zero",
        status: "warn",
        detail: "RPC did not return the launch transaction (history pruned); escrow and certificate checks above still hold.",
      });
    }
  }

  // Token display metadata (best-effort)
  try {
    const meta = await getTokenMetadata(
      connection,
      mint,
      "confirmed",
      TOKEN_2022_PROGRAM_ID,
    );
    if (meta) {
      base.name = meta.name;
      base.symbol = meta.symbol;
      if (meta.uri) {
        const json = (await fetch(meta.uri, {
          signal: AbortSignal.timeout(4000),
        }).then((r) => (r.ok ? r.json() : null))) as { image?: string } | null;
        if (json?.image && json.image.startsWith("https://")) {
          base.imageUri = json.image;
        }
      }
    }
  } catch {
    // metadata is cosmetic; verification stands without it
  }

  base.lockedPctOfSupply =
    Number((seal.tokens_locked * 10_000n) / 1_000_000_000_000_000n) / 100;
  base.sealed = checks.every((c) => c.status === "ok" || c.status === "warn");
  return base;
}

function short(addr: string): string {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

function fmtTokens(raw: bigint): string {
  return (raw / 1_000_000n).toLocaleString("en-US");
}

function fmtDate(ts: number): string {
  return new Date(ts * 1000).toISOString().slice(0, 10);
}
