import "server-only";
/**
 * Jito bundle submission. A bundle (≤5 txs) lands atomically in one slot or
 * not at all — this atomicity is the entire trust model of a sealed launch.
 */
import {
  PublicKey,
  SystemProgram,
  type TransactionInstruction,
  type VersionedTransaction,
} from "@solana/web3.js";
import { JITO_TIP_ACCOUNTS } from "@/lib/config";
import { env } from "./env";

export function randomTipAccount(): PublicKey {
  return new PublicKey(
    JITO_TIP_ACCOUNTS[Math.floor(Math.random() * JITO_TIP_ACCOUNTS.length)],
  );
}

export function buildTipInstruction(
  payer: PublicKey,
  lamports: bigint,
): TransactionInstruction {
  return SystemProgram.transfer({
    fromPubkey: payer,
    toPubkey: randomTipAccount(),
    lamports,
  });
}

interface JitoRpcResponse<T> {
  result?: T;
  error?: { code: number; message: string };
}

async function jitoRpc<T>(
  method: string,
  params: unknown[],
  pathHint = "/api/v1/bundles",
): Promise<T> {
  const res = await fetch(`${env.jitoBlockEngineUrl}${pathHint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) {
    throw new Error(`Jito ${method} HTTP ${res.status}`);
  }
  const json = (await res.json()) as JitoRpcResponse<T>;
  if (json.error) {
    throw new Error(`Jito ${method}: ${json.error.message}`);
  }
  return json.result as T;
}

/** Submit a signed bundle; returns the bundle id. */
export async function sendBundle(
  txs: VersionedTransaction[],
): Promise<string> {
  const encoded = txs.map((tx) => Buffer.from(tx.serialize()).toString("base64"));
  return jitoRpc<string>("sendBundle", [encoded, { encoding: "base64" }]);
}

export type JitoBundleStatus =
  | { state: "pending" }
  | { state: "landed"; slot: number }
  | { state: "failed"; error: string };

export async function getBundleStatus(
  bundleId: string,
): Promise<JitoBundleStatus> {
  interface StatusResult {
    value: Array<{
      bundle_id: string;
      status?: string;
      confirmation_status?: string;
      slot?: number;
      landed_slot?: number | null;
      err?: unknown;
    }>;
  }
  // getInflightBundleStatuses covers the recent window; getBundleStatuses
  // covers landed bundles.
  const inflight = await jitoRpc<StatusResult>("getInflightBundleStatuses", [
    [bundleId],
  ]).catch(() => null);
  const entry = inflight?.value?.[0];
  if (entry) {
    if (entry.status === "Landed") {
      return { state: "landed", slot: entry.landed_slot ?? entry.slot ?? 0 };
    }
    if (entry.status === "Failed") {
      return { state: "failed", error: "Bundle failed to land" };
    }
    if (entry.status === "Pending" || entry.status === "Invalid") {
      // "Invalid" briefly appears before the bundle enters the in-flight set.
      return { state: "pending" };
    }
  }
  const landed = await jitoRpc<StatusResult>("getBundleStatuses", [
    [bundleId],
  ]).catch(() => null);
  const l = landed?.value?.[0];
  if (l && (l.confirmation_status === "confirmed" || l.confirmation_status === "finalized")) {
    return { state: "landed", slot: l.slot ?? 0 };
  }
  return { state: "pending" };
}
