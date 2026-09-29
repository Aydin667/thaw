import "server-only";
/**
 * Adapter between @solana/kit-style instructions (used by sas-lib and
 * lighthouse-sdk) and @solana/web3.js v1 TransactionInstruction (used by the
 * pump SDK, Anchor, and our transaction assembly).
 */
import { PublicKey, TransactionInstruction } from "@solana/web3.js";

interface KitAccountMeta {
  address: string;
  role: number; // 0 readonly, 1 writable, 2 readonly+signer, 3 writable+signer
}

export interface KitInstruction {
  programAddress: string;
  accounts?: readonly KitAccountMeta[];
  data?: Uint8Array;
}

export function kitToWeb3Instruction(ix: KitInstruction): TransactionInstruction {
  return new TransactionInstruction({
    programId: new PublicKey(ix.programAddress),
    keys: (ix.accounts ?? []).map((a) => ({
      pubkey: new PublicKey(a.address),
      isSigner: a.role >= 2,
      isWritable: a.role === 1 || a.role === 3,
    })),
    data: Buffer.from(ix.data ?? new Uint8Array()),
  });
}
