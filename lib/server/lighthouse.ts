import "server-only";
/**
 * Lighthouse assertions — appended to the escrow transaction so the entire
 * bundle reverts unless the on-chain outcome matches the declared seal.
 */
import type { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { kitToWeb3Instruction, type KitInstruction } from "./kit-adapter";

/**
 * Assert that `tokenAccount` holds exactly `amountRaw` tokens. Used to prove
 * the dev wallet retains zero unlocked tokens after the escrow deposit.
 */
export async function buildAssertTokenAmountInstruction(
  tokenAccount: PublicKey,
  amountRaw: bigint,
): Promise<TransactionInstruction> {
  const { getAssertTokenAccountInstruction } = await import("lighthouse-sdk");
  const ix = getAssertTokenAccountInstruction({
    targetAccount: tokenAccount.toBase58() as never,
    assertion: {
      __kind: "Amount",
      value: amountRaw,
      operator: 0, // IntegerOperator.Equal
    } as never,
  });
  return kitToWeb3Instruction(ix as unknown as KitInstruction);
}
