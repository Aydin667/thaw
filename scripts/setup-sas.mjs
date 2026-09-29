/**
 * One-time SAS registry setup: creates the Thaw credential and the
 * SealedLaunchV1 schema under the platform authority.
 *
 * Usage:
 *   SOLANA_RPC_URL=... PLATFORM_KEYPAIR=... node scripts/setup-sas.mjs
 *
 * Idempotent: skips anything that already exists. Costs a few thousand
 * lamports of rent, paid by the platform key.
 */
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import bs58 from "bs58";
import {
  deriveCredentialPda,
  deriveSchemaPda,
  getCreateCredentialInstruction,
  getCreateSchemaInstruction,
} from "sas-lib";
import { createNoopSigner } from "@solana/kit";

const CREDENTIAL_NAME = "Thaw";
const SCHEMA_NAME = "SealedLaunchV1";
const SCHEMA_VERSION = 1;
const SCHEMA_LAYOUT = new Uint8Array([12, 12, 12, 3, 3, 8, 8, 12, 12, 8]);
const SCHEMA_FIELDS = [
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

function kitToWeb3(ix) {
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

const rpc = process.env.SOLANA_RPC_URL;
const secret = process.env.PLATFORM_KEYPAIR;
if (!rpc || !secret) {
  console.error("Set SOLANA_RPC_URL and PLATFORM_KEYPAIR env vars.");
  process.exit(1);
}

const connection = new Connection(rpc, "confirmed");
const platform = Keypair.fromSecretKey(bs58.decode(secret));
const authority = platform.publicKey.toBase58();
const signer = createNoopSigner(authority);

const [credential] = await deriveCredentialPda({
  authority,
  name: CREDENTIAL_NAME,
});
const [schema] = await deriveSchemaPda({
  credential,
  name: SCHEMA_NAME,
  version: SCHEMA_VERSION,
});

console.log("Platform authority:", authority);
console.log("Credential PDA    :", credential);
console.log("Schema PDA        :", schema);

const ixs = [];
const credInfo = await connection.getAccountInfo(new PublicKey(credential));
if (credInfo) {
  console.log("Credential already exists — skipping.");
} else {
  ixs.push(
    kitToWeb3(
      getCreateCredentialInstruction({
        payer: signer,
        credential,
        authority: signer,
        name: CREDENTIAL_NAME,
        signers: [authority],
      }),
    ),
  );
}

const schemaInfo = await connection.getAccountInfo(new PublicKey(schema));
if (schemaInfo) {
  console.log("Schema already exists — skipping.");
} else {
  ixs.push(
    kitToWeb3(
      getCreateSchemaInstruction({
        authority: signer,
        payer: signer,
        name: SCHEMA_NAME,
        credential,
        description:
          "Thaw sealed launch certificate: a Pump.fun token whose creator allocation was bought and locked into an uncancellable Jupiter Lock vesting escrow atomically at creation. thaw.lol",
        layout: SCHEMA_LAYOUT,
        fieldNames: SCHEMA_FIELDS,
        schema,
      }),
    ),
  );
}

if (ixs.length === 0) {
  console.log("Nothing to do.");
  process.exit(0);
}

const tx = new Transaction().add(...ixs);
const sig = await sendAndConfirmTransaction(connection, tx, [platform]);
console.log("Setup complete:", sig);
