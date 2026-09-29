import "server-only";
/**
 * IPFS pinning via Pinata. The token image and Metaplex-style metadata JSON
 * are pinned under our account; the resulting URI is what create_v2 stores.
 */
import { env } from "./env";

const PINATA_UPLOAD_URL = "https://uploads.pinata.cloud/v3/files";

async function pinFile(file: File): Promise<string> {
  const jwt = env.pinataJwt;
  if (!jwt) throw new Error("PINATA_JWT is not configured");
  const form = new FormData();
  form.append("file", file);
  form.append("network", "public");
  const res = await fetch(PINATA_UPLOAD_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}` },
    body: form,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Pinata upload failed (${res.status}): ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as { data?: { cid?: string } };
  const cid = json.data?.cid;
  if (!cid) throw new Error("Pinata upload returned no CID");
  return cid;
}

export function gatewayUrl(cid: string): string {
  const gw = env.pinataGateway ?? "gateway.pinata.cloud";
  return `https://${gw}/ipfs/${cid}`;
}

export async function pinImage(
  bytes: Uint8Array,
  mime: string,
  filename: string,
): Promise<{ cid: string; url: string }> {
  const file = new File([bytes as BlobPart], filename, { type: mime });
  const cid = await pinFile(file);
  return { cid, url: gatewayUrl(cid) };
}

export interface TokenMetadataJson {
  name: string;
  symbol: string;
  description: string;
  image: string;
  showName: boolean;
  createdOn: string;
  website?: string;
  twitter?: string;
  telegram?: string;
}

export async function pinMetadata(
  meta: TokenMetadataJson,
): Promise<{ cid: string; url: string }> {
  const file = new File([JSON.stringify(meta)], "metadata.json", {
    type: "application/json",
  });
  const cid = await pinFile(file);
  return { cid, url: gatewayUrl(cid) };
}
