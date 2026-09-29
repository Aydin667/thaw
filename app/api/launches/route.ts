import { NextResponse } from "next/server";
import { listLaunches } from "@/lib/server/launches";
import { hasPlatformKeypair } from "@/lib/server/env";

export const runtime = "nodejs";

export async function GET() {
  try {
    if (!hasPlatformKeypair()) {
      return NextResponse.json({ launches: [] });
    }
    const launches = await listLaunches();
    return NextResponse.json(
      { launches },
      { headers: { "Cache-Control": "public, max-age=20" } },
    );
  } catch (e) {
    console.error("launches failed:", e);
    return NextResponse.json({ launches: [] });
  }
}
