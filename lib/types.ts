/** Shared types between client and server. Amounts cross the wire as strings. */

export interface SealSettings {
  presetId: "sprint" | "standard" | "diamond" | "custom";
  cliffDays: number;
  linearDays: number;
  devBuySol: number;
}

export interface LaunchFormData {
  name: string;
  symbol: string;
  description: string;
  website?: string;
  twitter?: string;
  telegram?: string;
  seal: SealSettings;
}

/** Human-readable description of one transaction the user will sign. */
export interface TxManifestEntry {
  index: number;
  label: string;
  signer: "you" | "platform";
  actions: string[];
}

export interface CostBreakdown {
  devBuyLamports: string;
  platformFeeLamports: string;
  jitoTipLamports: string;
  estNetworkLamports: string;
  totalLamports: string;
}

export interface PrepareResponse {
  sessionId: string;
  mint: string;
  escrow: string;
  expectedTokensRaw: string; // 6-decimal raw amount the dev buy yields
  expectedTokensPctOfSupply: number;
  metadataUri: string;
  cost: CostBreakdown;
  manifest: TxManifestEntry[];
  /** base64 unsigned transactions the wallet must sign, in order */
  transactionsToSign: string[];
  cliffTs: number;
  vestEndTs: number;
  dryRun: boolean;
}

export type BundleState =
  | "pending"
  | "landed"
  | "failed"
  | "expired"
  | "simulated";

export interface ExecuteResponse {
  bundleId: string;
  state: BundleState;
}

export interface StatusResponse {
  state: BundleState;
  slot?: number;
  signatures?: string[];
  error?: string;
  mint?: string;
}

export interface CheckResult {
  id: string;
  label: string;
  status: "ok" | "fail" | "warn" | "pending";
  detail: string;
  link?: string;
}

export interface VerificationReport {
  mint: string;
  sealed: boolean;
  checkedAt: number;
  name?: string;
  symbol?: string;
  imageUri?: string;
  creator?: string;
  launchSlot?: number;
  bundleSignature?: string;
  devBuySol?: number;
  lockedTokensRaw?: string;
  lockedPctOfSupply?: number;
  escrow?: string;
  cliffTs?: number;
  vestEndTs?: number;
  withdrawnRaw?: string;
  remainingLockedRaw?: string;
  attestation?: string;
  checks: CheckResult[];
  links: {
    pumpFun: string;
    solscan: string;
    escrow?: string;
    attestation?: string;
  };
}

export interface LaunchListEntry {
  mint: string;
  name: string;
  symbol: string;
  imageUri?: string;
  creator: string;
  launchedAt: number;
  devBuySol: number;
  lockedPctOfSupply: number;
  cliffTs: number;
  vestEndTs: number;
}

export interface ApiError {
  error: { code: string; message: string };
}
