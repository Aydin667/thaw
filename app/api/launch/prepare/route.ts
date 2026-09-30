import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  launchFormSchema,
  sniffImageMime,
  validateVestTotal,
} from "@/lib/validation";
import { prepareLaunch } from "@/lib/server/launch";
import { pinImage, pinMetadata } from "@/lib/server/ipfs";
import { clientIp, rateLimit } from "@/lib/server/ratelimit";
import { env, hasPlatformKeypair } from "@/lib/server/env";
import { getConnection } from "@/lib/server/rpc";

export const runtime = "nodejs";
export const maxDuration = 60;

function err(code: string, message: string, status = 400) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(req: Request) {
  try {
    if (!rateLimit(`prepare:${clientIp(req)}`, 6, 60_000)) {
      return err("RATE_LIMITED", "Too many launch attempts — wait a minute.", 429);
    }
    if (!hasPlatformKeypair()) {
      return err("NOT_CONFIGURED", "Server is not configured for launches yet.", 503);
    }

    const form = await req.formData();
    const rawFields = {
      name: String(form.get("name") ?? ""),
      symbol: String(form.get("symbol") ?? ""),
      description: String(form.get("description") ?? ""),
      website: String(form.get("website") ?? ""),
      twitter: String(form.get("twitter") ?? ""),
      telegram: String(form.get("telegram") ?? ""),
      devBuySol: Number(form.get("devBuySol")),
      cliffDays: Number(form.get("cliffDays")),
      linearDays: Number(form.get("linearDays")),
      creator: String(form.get("creator") ?? ""),
    };

    const parsed = launchFormSchema.safeParse(rawFields);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return err("VALIDATION", `${first.path.join(".")}: ${first.message}`);
    }
    const vestErr = validateVestTotal(parsed.data.cliffDays, parsed.data.linearDays);
    if (vestErr) return err("VALIDATION", vestErr);

    const image = form.get("image");
    if (!(image instanceof File) || image.size === 0) {
      return err("VALIDATION", "Token image is required.");
    }
    if (image.size > MAX_IMAGE_BYTES) {
      return err("VALIDATION", "Image too large (max 4.3 MB).");
    }
    const imageBytes = new Uint8Array(await image.arrayBuffer());
    const mime = sniffImageMime(imageBytes);
    if (!mime || !ALLOWED_IMAGE_TYPES.has(mime)) {
      return err("VALIDATION", "Image must be PNG, JPEG, GIF, or WebP.");
    }

    const creator = new PublicKey(parsed.data.creator);
    const devBuyLamports = BigInt(Math.round(parsed.data.devBuySol * 1e9));

    // Balance pre-check: total cost + 10% buffer
    const connection = getConnection();
    const balance = BigInt(await connection.getBalance(creator, "confirmed"));
    const needed =
      devBuyLamports +
      env.platformFeeLamports +
      env.jitoTipLamports +
      10_000_000n; // rent + fees buffer
    if (balance < needed) {
      return err(
        "INSUFFICIENT_SOL",
        `Wallet holds ${(Number(balance) / 1e9).toFixed(3)} SOL but the launch needs about ${(Number(needed) / 1e9).toFixed(3)} SOL.`,
      );
    }

    // Pin image + metadata (skipped placeholder in dry-run without Pinata)
    let metadataUri: string;
    if (env.dryRun && !env.pinataJwt) {
      metadataUri = "https://thawlaunch.lol/dryrun-metadata.json";
    } else {
      const ext = mime.split("/")[1];
      const pinnedImage = await pinImage(imageBytes, mime, `token.${ext}`);
      const pinnedMeta = await pinMetadata({
        name: parsed.data.name,
        symbol: parsed.data.symbol.toUpperCase(),
        description: parsed.data.description,
        image: pinnedImage.url,
        showName: true,
        createdOn: "https://thawlaunch.lol",
        ...(parsed.data.website ? { website: parsed.data.website } : {}),
        ...(parsed.data.twitter ? { twitter: parsed.data.twitter } : {}),
        ...(parsed.data.telegram ? { telegram: parsed.data.telegram } : {}),
      });
      metadataUri = pinnedMeta.url;
    }

    const prepared = await prepareLaunch({
      creator,
      name: parsed.data.name,
      symbol: parsed.data.symbol.toUpperCase(),
      metadataUri,
      devBuyLamports,
      cliffDays: parsed.data.cliffDays,
      linearDays: parsed.data.linearDays,
    });

    return NextResponse.json(prepared);
  } catch (e) {
    console.error("prepare failed:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return err("PREPARE_FAILED", `Could not prepare the launch: ${msg}`, 500);
  }
}
