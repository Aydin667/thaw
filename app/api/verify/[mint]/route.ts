import { NextResponse } from "next/server";
import { verifyMint } from "@/lib/server/verify";
import { clientIp, rateLimit } from "@/lib/server/ratelimit";

export const runtime = "nodejs";

const MINT_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ mint: string }> },
) {
  const { mint } = await params;
  if (!MINT_RE.test(mint)) {
    return NextResponse.json(
      { error: { code: "BAD_MINT", message: "Not a valid mint address." } },
      { status: 400 },
    );
  }
  if (!rateLimit(`verify:${clientIp(req)}`, 60, 60_000)) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Slow down." } },
      { status: 429 },
    );
  }
  try {
    const report = await verifyMint(mint);
    return NextResponse.json(report, {
      headers: { "Cache-Control": "public, max-age=10" },
    });
  } catch (e) {
    console.error("verify failed:", e);
    return NextResponse.json(
      { error: { code: "VERIFY_FAILED", message: "Verification lookup failed." } },
      { status: 500 },
    );
  }
}
