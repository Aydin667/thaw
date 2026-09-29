import "server-only";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const env = {
  get rpcUrl(): string {
    return required("SOLANA_RPC_URL");
  },
  get pinataJwt(): string | undefined {
    return process.env.PINATA_JWT || undefined;
  },
  get pinataGateway(): string | undefined {
    return process.env.PINATA_GATEWAY || undefined;
  },
  get jitoBlockEngineUrl(): string {
    return (
      process.env.JITO_BLOCK_ENGINE_URL ??
      "https://mainnet.block-engine.jito.wtf"
    );
  },
  get jitoTipLamports(): bigint {
    return BigInt(process.env.JITO_TIP_LAMPORTS ?? "1000000");
  },
  get platformFeeLamports(): bigint {
    return BigInt(process.env.PLATFORM_FEE_LAMPORTS ?? "20000000");
  },
  get dryRun(): boolean {
    return process.env.DRY_RUN === "1";
  },
};

let platformKeypair: Keypair | null = null;

/**
 * The platform hot key. Holds no user funds — it issues attestations,
 * receives the platform fee, and pays rent on the attestation account.
 */
export function getPlatformKeypair(): Keypair {
  if (!platformKeypair) {
    const raw = required("PLATFORM_KEYPAIR");
    platformKeypair = Keypair.fromSecretKey(bs58.decode(raw));
  }
  return platformKeypair;
}

export function hasPlatformKeypair(): boolean {
  return Boolean(process.env.PLATFORM_KEYPAIR);
}
