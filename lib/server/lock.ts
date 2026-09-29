import "server-only";
/**
 * Jupiter Lock (locker program) integration. The dev's entire bought
 * allocation is deposited into a vesting escrow whose schedule is public and
 * whose cancel/update modes are NONE — uncancellable, immutable, visible on
 * lock.jup.ag and any explorer.
 */
import { BN, Program } from "@coral-xyz/anchor";
import {
  PublicKey,
  SystemProgram,
  type TransactionInstruction,
} from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
} from "@solana/spl-token";
import { LOCKER_PROGRAM_ID, VEST_PERIOD_SECONDS } from "@/lib/config";
import { getConnection } from "./rpc";
import lockerIdl from "./idl/locker.json";

const LOCKER_PROGRAM = new PublicKey(LOCKER_PROGRAM_ID);

export function escrowPda(base: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), base.toBuffer()],
    LOCKER_PROGRAM,
  )[0];
}

export function escrowMetadataPda(escrow: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("escrow_metadata"), escrow.toBuffer()],
    LOCKER_PROGRAM,
  )[0];
}

function eventAuthorityPda(): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("__event_authority")],
    LOCKER_PROGRAM,
  )[0];
}

function getLockerProgram(): Program {
  // Connection-only provider: we only build instructions and fetch accounts,
  // never send through Anchor, so no wallet is needed.
  return new Program(lockerIdl as never, { connection: getConnection() });
}

export interface VestingSchedule {
  /** unix seconds — vesting clock starts here (launch time) */
  startTs: number;
  /** unix seconds — nothing unlocks before this */
  cliffTs: number;
  /** total raw token amount locked */
  totalRaw: BN;
  /** linear release duration after cliff, seconds */
  linearSeconds: number;
}

export interface BuiltEscrow {
  instructions: TransactionInstruction[];
  escrow: PublicKey;
  escrowToken: PublicKey;
  params: {
    vestingStartTime: BN;
    cliffTime: BN;
    frequency: BN;
    cliffUnlockAmount: BN;
    amountPerPeriod: BN;
    numberOfPeriod: BN;
  };
  vestEndTs: number;
}

/**
 * Build the escrow leg: create escrow ATA + create_vesting_escrow_v2 +
 * escrow metadata. `base` is an ephemeral keypair that must co-sign.
 *
 * The full amount is split into hourly periods across the linear duration.
 * cliff_unlock_amount is the rounding remainder so that
 * cliff_unlock + amount_per_period * number_of_period == totalRaw exactly —
 * the locker requires the sender ATA to cover the exact sum, and we assert
 * the dev wallet ends at zero.
 */
export function buildEscrowInstructions(args: {
  base: PublicKey;
  sender: PublicKey;
  recipient: PublicKey;
  tokenMint: PublicKey;
  schedule: VestingSchedule;
  tokenName: string;
  symbol: string;
}): Promise<BuiltEscrow> {
  return buildEscrowInstructionsInner(args);
}

async function buildEscrowInstructionsInner(args: {
  base: PublicKey;
  sender: PublicKey;
  recipient: PublicKey;
  tokenMint: PublicKey;
  schedule: VestingSchedule;
  tokenName: string;
  symbol: string;
}): Promise<BuiltEscrow> {
  const { base, sender, recipient, tokenMint, schedule } = args;
  const program = getLockerProgram();

  const escrow = escrowPda(base);
  const escrowToken = getAssociatedTokenAddressSync(
    tokenMint,
    escrow,
    true,
    TOKEN_2022_PROGRAM_ID,
  );
  const senderToken = getAssociatedTokenAddressSync(
    tokenMint,
    sender,
    false,
    TOKEN_2022_PROGRAM_ID,
  );

  const numberOfPeriod = Math.max(
    1,
    Math.floor(schedule.linearSeconds / VEST_PERIOD_SECONDS),
  );
  const amountPerPeriod = schedule.totalRaw.divn(numberOfPeriod);
  const cliffUnlockAmount = schedule.totalRaw.sub(
    amountPerPeriod.muln(numberOfPeriod),
  );

  const params = {
    vestingStartTime: new BN(schedule.startTs),
    cliffTime: new BN(schedule.cliffTs),
    frequency: new BN(VEST_PERIOD_SECONDS),
    cliffUnlockAmount,
    amountPerPeriod,
    numberOfPeriod: new BN(numberOfPeriod),
  };

  const createEscrowAtaIx = createAssociatedTokenAccountIdempotentInstruction(
    sender,
    escrowToken,
    escrow,
    tokenMint,
    TOKEN_2022_PROGRAM_ID,
  );

  const escrowIx = await program.methods
    .createVestingEscrowV2(
      {
        vestingStartTime: params.vestingStartTime,
        cliffTime: params.cliffTime,
        frequency: params.frequency,
        cliffUnlockAmount: params.cliffUnlockAmount,
        amountPerPeriod: params.amountPerPeriod,
        numberOfPeriod: params.numberOfPeriod,
        updateRecipientMode: 0, // NONE — recipient can never change
        cancelMode: 0, // NONE — nobody can cancel the lock
      },
      null,
    )
    .accountsStrict({
      base,
      escrow,
      tokenMint,
      escrowToken,
      sender,
      senderToken,
      recipient,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      eventAuthority: eventAuthorityPda(),
      program: LOCKER_PROGRAM,
    })
    .instruction();

  const metadataIx = await program.methods
    .createVestingEscrowMetadata({
      name: `Thaw Seal — ${args.symbol}`,
      description: `Creator allocation of ${args.tokenName} (${args.symbol}), sealed at launch via thaw.lol. Uncancellable vesting escrow created atomically with the token.`,
      creatorEmail: "",
      recipientEmail: "",
    })
    .accountsStrict({
      escrow,
      creator: sender,
      escrowMetadata: escrowMetadataPda(escrow),
      payer: sender,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  const vestEndTs =
    schedule.cliffTs + numberOfPeriod * VEST_PERIOD_SECONDS;

  return {
    instructions: [createEscrowAtaIx, escrowIx, metadataIx],
    escrow,
    escrowToken,
    params,
    vestEndTs,
  };
}

export interface EscrowState {
  recipient: PublicKey;
  tokenMint: PublicKey;
  creator: PublicKey;
  cliffTime: number;
  frequency: number;
  cliffUnlockAmount: BN;
  amountPerPeriod: BN;
  numberOfPeriod: number;
  totalDeposited: BN;
  totalClaimed: BN;
  cancelMode: number;
  updateRecipientMode: number;
  vestingStartTime: number;
}

export async function fetchEscrowState(
  escrow: PublicKey,
): Promise<EscrowState | null> {
  const program = getLockerProgram();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const acc: any = await (program.account as any).vestingEscrow.fetchNullable(
    escrow,
  );
  if (!acc) return null;
  const amountPerPeriod: BN = acc.amountPerPeriod;
  const numberOfPeriod = Number(acc.numberOfPeriod.toString());
  const totalDeposited = acc.cliffUnlockAmount.add(
    amountPerPeriod.muln(numberOfPeriod),
  );
  return {
    recipient: acc.recipient,
    tokenMint: acc.tokenMint,
    creator: acc.creator,
    cliffTime: Number(acc.cliffTime.toString()),
    frequency: Number(acc.frequency.toString()),
    cliffUnlockAmount: acc.cliffUnlockAmount,
    amountPerPeriod,
    numberOfPeriod,
    totalDeposited,
    totalClaimed: acc.totalClaimedAmount ?? new BN(0),
    cancelMode: acc.cancelMode,
    updateRecipientMode: acc.updateRecipientMode,
    vestingStartTime: Number(acc.vestingStartTime.toString()),
  };
}
