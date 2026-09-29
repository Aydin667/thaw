import "server-only";
import {
  OnlinePumpSdk,
  PumpSdk,
  getBuyTokenAmountFromSolAmount,
  type Global,
  type FeeConfig,
  type BondingCurve,
} from "@pump-fun/pump-sdk";
import BN from "bn.js";
import { PublicKey, type TransactionInstruction } from "@solana/web3.js";
import { getConnection } from "./rpc";

const pumpSdk = new PumpSdk();
let onlineSdk: OnlinePumpSdk | null = null;

export function getOnlinePumpSdk(): OnlinePumpSdk {
  if (!onlineSdk) onlineSdk = new OnlinePumpSdk(getConnection());
  return onlineSdk;
}

interface GlobalState {
  global: Global;
  feeConfig: FeeConfig;
  fetchedAt: number;
}

let cachedGlobal: GlobalState | null = null;
const GLOBAL_TTL_MS = 5 * 60 * 1000;

export async function getPumpGlobalState(): Promise<GlobalState> {
  if (cachedGlobal && Date.now() - cachedGlobal.fetchedAt < GLOBAL_TTL_MS) {
    return cachedGlobal;
  }
  const sdk = getOnlinePumpSdk();
  const [global, feeConfig] = await Promise.all([
    sdk.fetchGlobal(),
    sdk.fetchFeeConfig(),
  ]);
  cachedGlobal = { global, feeConfig, fetchedAt: Date.now() };
  return cachedGlobal;
}

/**
 * Tokens (raw, 6 decimals) a dev buy of `solLamports` yields on a brand-new
 * bonding curve. Deterministic because the atomic bundle guarantees the buy
 * is the first trade.
 */
export async function computeNewCurveBuyAmount(solLamports: bigint): Promise<{
  tokensRaw: BN;
  totalSupply: BN;
}> {
  const { global, feeConfig } = await getPumpGlobalState();
  const { NATIVE_MINT } = await import("@solana/spl-token");
  const tokensRaw = getBuyTokenAmountFromSolAmount({
    global,
    feeConfig,
    mintSupply: null,
    bondingCurve: null,
    amount: new BN(solLamports.toString()),
    quoteMint: NATIVE_MINT,
  });
  return { tokensRaw, totalSupply: global.tokenTotalSupply };
}

/**
 * create_v2 + creator ATA + first buy, SOL-quoted — the token cannot be
 * traded by anyone before this buy because they share one transaction.
 */
export async function buildCreateAndBuyInstructions(params: {
  mint: PublicKey;
  name: string;
  symbol: string;
  uri: string;
  creator: PublicKey;
  user: PublicKey;
  tokensRaw: BN;
  solLamports: bigint;
}): Promise<TransactionInstruction[]> {
  const { global } = await getPumpGlobalState();
  return pumpSdk.createV2AndBuyInstructions({
    global,
    mint: params.mint,
    name: params.name,
    symbol: params.symbol,
    uri: params.uri,
    creator: params.creator,
    user: params.user,
    amount: params.tokensRaw,
    solAmount: new BN(params.solLamports.toString()),
    mayhemMode: false,
  });
}

export async function fetchBondingCurve(
  mint: PublicKey,
): Promise<BondingCurve | null> {
  const connection = getConnection();
  const { bondingCurvePda } = await import("@pump-fun/pump-sdk");
  const info = await connection.getAccountInfo(bondingCurvePda(mint));
  if (!info) return null;
  return pumpSdk.decodeBondingCurveNullable(info);
}
