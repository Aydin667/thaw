import "server-only";
/**
 * Solana Attestation Service integration. Thaw issues one on-chain
 * "SealedLaunchV1" attestation per launch, keyed by the mint (nonce), under
 * the platform's credential. Anyone can locate a launch certificate from the
 * mint address alone and read it without touching our API.
 *
 * Schema fields (borsh, in order):
 *   mint: String            — base58 mint
 *   creator: String         — base58 creator wallet
 *   escrow: String          — base58 Jupiter Lock escrow PDA
 *   dev_buy_lamports: u64
 *   tokens_locked: u64      — raw (6 decimals)
 *   cliff_ts: i64
 *   vest_end_ts: i64
 *   schedule: String        — human-readable, e.g. "30d cliff + 90d linear"
 *   launch_sig: String      — signature of the create+buy transaction
 *   launched_at: i64        — unix seconds at launch build time
 */
import { PublicKey, type TransactionInstruction } from "@solana/web3.js";
import {
  SAS_CREDENTIAL_NAME,
  SAS_SCHEMA_NAME,
  SAS_SCHEMA_VERSION,
} from "@/lib/config";
import { kitToWeb3Instruction, type KitInstruction } from "./kit-adapter";

// String=12, u64=3, i64=8 (SAS compact layout codes)
export const SEAL_SCHEMA_LAYOUT = new Uint8Array([
  12, 12, 12, 3, 3, 8, 8, 12, 12, 8,
]);
export const SEAL_SCHEMA_FIELDS = [
  "mint",
  "creator",
  "escrow",
  "dev_buy_lamports",
  "tokens_locked",
  "cliff_ts",
  "vest_end_ts",
  "schedule",
  "launch_sig",
  "launched_at",
];

export interface SealAttestationData {
  mint: string;
  creator: string;
  escrow: string;
  dev_buy_lamports: bigint;
  tokens_locked: bigint;
  cliff_ts: bigint;
  vest_end_ts: bigint;
  schedule: string;
  launch_sig: string;
  launched_at: bigint;
}

export async function deriveSealPdas(platformAuthority: PublicKey): Promise<{
  credential: PublicKey;
  schema: PublicKey;
}> {
  const { deriveCredentialPda, deriveSchemaPda } = await import("sas-lib");
  const [credential] = await deriveCredentialPda({
    authority: platformAuthority.toBase58() as never,
    name: SAS_CREDENTIAL_NAME,
  });
  const [schema] = await deriveSchemaPda({
    credential,
    name: SAS_SCHEMA_NAME,
    version: SAS_SCHEMA_VERSION,
  });
  return {
    credential: new PublicKey(credential),
    schema: new PublicKey(schema),
  };
}

export async function deriveAttestationAddress(
  platformAuthority: PublicKey,
  mint: PublicKey,
): Promise<PublicKey> {
  const { deriveAttestationPda } = await import("sas-lib");
  const { credential, schema } = await deriveSealPdas(platformAuthority);
  const [attestation] = await deriveAttestationPda({
    credential: credential.toBase58() as never,
    schema: schema.toBase58() as never,
    nonce: mint.toBase58() as never,
  });
  return new PublicKey(attestation);
}

/** Borsh-serialize attestation data against our fixed schema layout. */
export async function serializeSealData(
  data: SealAttestationData,
): Promise<Uint8Array> {
  const { serializeAttestationData } = await import("sas-lib");
  // Minimal on-the-fly Schema object; only layout + fieldNames are read.
  const fieldNamesBytes = encodeFieldNames(SEAL_SCHEMA_FIELDS);
  const schema = {
    discriminator: 1,
    credential: "" as never,
    name: new Uint8Array(),
    description: new Uint8Array(),
    layout: SEAL_SCHEMA_LAYOUT,
    fieldNames: fieldNamesBytes,
    isPaused: false,
    version: SAS_SCHEMA_VERSION,
  };
  return serializeAttestationData(schema as never, {
    ...data,
  });
}

/** SAS stores field names as concatenated (u32-len, utf8) entries. */
function encodeFieldNames(fields: string[]): Uint8Array {
  const parts: number[] = [];
  for (const f of fields) {
    const bytes = new TextEncoder().encode(f);
    const len = new Uint8Array(4);
    new DataView(len.buffer).setUint32(0, bytes.length, true);
    parts.push(...len, ...bytes);
  }
  return new Uint8Array(parts);
}

export async function buildCreateAttestationInstruction(args: {
  platformAuthority: PublicKey;
  mint: PublicKey;
  data: SealAttestationData;
  /** unix seconds; 0 = never expires */
  expiry?: number;
}): Promise<{ instruction: TransactionInstruction; attestation: PublicKey }> {
  const { getCreateAttestationInstruction } = await import("sas-lib");
  const { createNoopSigner } = await import("@solana/kit");
  const { credential, schema } = await deriveSealPdas(args.platformAuthority);
  const attestation = await deriveAttestationAddress(
    args.platformAuthority,
    args.mint,
  );
  const serialized = await serializeSealData(args.data);
  const authoritySigner = createNoopSigner(
    args.platformAuthority.toBase58() as never,
  );
  const ix = getCreateAttestationInstruction({
    payer: authoritySigner,
    authority: authoritySigner,
    credential: credential.toBase58() as never,
    schema: schema.toBase58() as never,
    attestation: attestation.toBase58() as never,
    nonce: args.mint.toBase58() as never,
    data: serialized,
    expiry: args.expiry ?? 0,
  });
  return {
    instruction: kitToWeb3Instruction(ix as unknown as KitInstruction),
    attestation,
  };
}

export async function deserializeSealData(
  raw: Uint8Array,
): Promise<SealAttestationData | null> {
  try {
    const { deserializeAttestationData } = await import("sas-lib");
    const schema = {
      discriminator: 1,
      credential: "" as never,
      name: new Uint8Array(),
      description: new Uint8Array(),
      layout: SEAL_SCHEMA_LAYOUT,
      fieldNames: encodeFieldNames(SEAL_SCHEMA_FIELDS),
      isPaused: false,
      version: SAS_SCHEMA_VERSION,
    };
    const out = deserializeAttestationData(schema as never, raw) as Record<
      string,
      unknown
    >;
    return {
      mint: String(out.mint),
      creator: String(out.creator),
      escrow: String(out.escrow),
      dev_buy_lamports: BigInt(out.dev_buy_lamports as string | number | bigint),
      tokens_locked: BigInt(out.tokens_locked as string | number | bigint),
      cliff_ts: BigInt(out.cliff_ts as string | number | bigint),
      vest_end_ts: BigInt(out.vest_end_ts as string | number | bigint),
      schedule: String(out.schedule),
      launch_sig: String(out.launch_sig),
      launched_at: BigInt(out.launched_at as string | number | bigint),
    };
  } catch {
    return null;
  }
}
