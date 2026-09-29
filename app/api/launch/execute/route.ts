import { NextResponse } from "next/server";
import { z } from "zod";
import { LaunchError, executeLaunch } from "@/lib/server/launch";
import { clientIp, rateLimit } from "@/lib/server/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  sessionId: z.string().regex(/^[a-f0-9]{32}$/),
  signedTxs: z.array(z.string().max(6000)).min(2).max(2),
});

export async function POST(req: Request) {
  try {
    if (!rateLimit(`execute:${clientIp(req)}`, 10, 60_000)) {
      return NextResponse.json(
        { error: { code: "RATE_LIMITED", message: "Too many requests." } },
        { status: 429 },
      );
    }
    const body = bodySchema.safeParse(await req.json());
    if (!body.success) {
      return NextResponse.json(
        { error: { code: "BAD_INPUT", message: "Malformed request." } },
        { status: 400 },
      );
    }
    const result = await executeLaunch(body.data);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof LaunchError) {
      return NextResponse.json(
        { error: { code: e.code, message: e.message } },
        { status: 400 },
      );
    }
    console.error("execute failed:", e);
    return NextResponse.json(
      {
        error: {
          code: "EXECUTE_FAILED",
          message:
            "Bundle submission failed. Nothing landed on-chain (launches are all-or-nothing) — you can safely retry.",
        },
      },
      { status: 500 },
    );
  }
}
