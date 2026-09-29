import { NextResponse } from "next/server";
import { getBundleStatus } from "@/lib/server/jito";
import { mintForBundle } from "@/lib/server/session";
import type { StatusResponse } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const bundleId = url.searchParams.get("bundle");
  if (!bundleId || bundleId.length > 128) {
    return NextResponse.json(
      { error: { code: "BAD_INPUT", message: "Missing bundle id." } },
      { status: 400 },
    );
  }

  const mint = mintForBundle(bundleId);

  if (bundleId.startsWith("dryrun-")) {
    const res: StatusResponse = { state: "simulated", mint };
    return NextResponse.json(res);
  }

  try {
    const status = await getBundleStatus(bundleId);
    const res: StatusResponse =
      status.state === "landed"
        ? { state: "landed", slot: status.slot, mint }
        : status.state === "failed"
          ? { state: "failed", error: status.error, mint }
          : { state: "pending", mint };
    return NextResponse.json(res);
  } catch {
    return NextResponse.json({ state: "pending", mint } satisfies StatusResponse);
  }
}
