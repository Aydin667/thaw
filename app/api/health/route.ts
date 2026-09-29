import { NextResponse } from "next/server";
import { hasPlatformKeypair } from "@/lib/server/env";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    configured: hasPlatformKeypair(),
    dryRun: process.env.DRY_RUN === "1",
    ts: Date.now(),
  });
}
