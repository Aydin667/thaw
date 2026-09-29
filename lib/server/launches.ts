import "server-only";
/**
 * Recent sealed launches, enumerated from the chain itself: every Thaw
 * launch has an SAS attestation under our credential+schema. No database —
 * the public record is the record.
 */
import { PublicKey } from "@solana/web3.js";
import { SAS_PROGRAM_ID } from "@/lib/config";
import type { LaunchListEntry } from "@/lib/types";
import { getConnection } from "./rpc";
import { getPlatformKeypair } from "./env";
import { deriveSealPdas, deserializeSealData } from "./attest";

const CACHE_TTL_MS = 30_000;
let cached: { entries: LaunchListEntry[]; at: number } | null = null;

export async function listLaunches(): Promise<LaunchListEntry[]> {
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.entries;

  const connection = getConnection();
  const platform = getPlatformKeypair().publicKey;
  const { credential, schema } = await deriveSealPdas(platform);

  // Attestation layout: disc(1) + nonce(32) + credential(33..65) + schema(65..97)
  const accounts = await connection.getProgramAccounts(
    new PublicKey(SAS_PROGRAM_ID),
    {
      filters: [
        { memcmp: { offset: 33, bytes: credential.toBase58() } },
        { memcmp: { offset: 65, bytes: schema.toBase58() } },
      ],
    },
  );

  const entries: LaunchListEntry[] = [];
  for (const { account } of accounts) {
    try {
      const data = account.data;
      const dataLen = data.readUInt32LE(97);
      const seal = await deserializeSealData(
        new Uint8Array(data.subarray(101, 101 + dataLen)),
      );
      if (!seal) continue;
      entries.push({
        mint: seal.mint,
        name: "",
        symbol: "",
        creator: seal.creator,
        launchedAt: Number(seal.launched_at),
        devBuySol: Number(seal.dev_buy_lamports) / 1e9,
        lockedPctOfSupply:
          Number((seal.tokens_locked * 10_000n) / 1_000_000_000_000_000n) / 100,
        cliffTs: Number(seal.cliff_ts),
        vestEndTs: Number(seal.vest_end_ts),
      });
    } catch {
      // skip undecodable entries
    }
  }
  entries.sort((a, b) => b.launchedAt - a.launchedAt);
  const top = entries.slice(0, 50);

  // Best-effort token names via Token-2022 metadata (parallel, capped)
  await Promise.all(
    top.slice(0, 12).map(async (e) => {
      try {
        const { getTokenMetadata } = await import("@solana/spl-token");
        const { TOKEN_2022_PROGRAM_ID } = await import("@solana/spl-token");
        const meta = await getTokenMetadata(
          connection,
          new PublicKey(e.mint),
          "confirmed",
          TOKEN_2022_PROGRAM_ID,
        );
        if (meta) {
          e.name = meta.name;
          e.symbol = meta.symbol;
        }
      } catch {
        /* cosmetic */
      }
    }),
  );

  cached = { entries: top, at: Date.now() };
  return top;
}
