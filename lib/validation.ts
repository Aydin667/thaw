import { z } from "zod";
import {
  MAX_DEV_BUY_SOL,
  MAX_TOTAL_VEST_DAYS,
  MIN_DEV_BUY_SOL,
  MIN_TOTAL_VEST_DAYS,
} from "./config";

const httpsUrl = z
  .string()
  .trim()
  .max(200)
  .refine((v) => {
    try {
      const u = new URL(v);
      return u.protocol === "https:";
    } catch {
      return false;
    }
  }, "Must be a valid https:// URL");

export const launchFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Token name is required")
    .max(32, "Max 32 characters (Metaplex limit)"),
  symbol: z
    .string()
    .trim()
    .min(1, "Ticker is required")
    .max(10, "Max 10 characters")
    .regex(/^[A-Za-z0-9]+$/, "Letters and numbers only"),
  description: z.string().trim().max(600).default(""),
  website: httpsUrl.optional().or(z.literal("")),
  twitter: httpsUrl.optional().or(z.literal("")),
  telegram: httpsUrl.optional().or(z.literal("")),
  devBuySol: z
    .number()
    .min(MIN_DEV_BUY_SOL, `Minimum dev buy is ${MIN_DEV_BUY_SOL} SOL`)
    .max(MAX_DEV_BUY_SOL, `Maximum dev buy is ${MAX_DEV_BUY_SOL} SOL`),
  // Thaw has no cliff; cliffDays is always 0 (kept for schema/type parity).
  cliffDays: z.number().int().min(0).max(0),
  linearDays: z.number().int().min(1).max(MAX_TOTAL_VEST_DAYS),
  creator: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "Invalid wallet"),
});

export type LaunchFormInput = z.infer<typeof launchFormSchema>;

export function validateVestTotal(cliffDays: number, linearDays: number) {
  if (cliffDays !== 0) {
    return "Thaw launches have no cliff — the bag melts from second zero.";
  }
  if (linearDays < MIN_TOTAL_VEST_DAYS) {
    return `Thaw duration must be at least ${MIN_TOTAL_VEST_DAYS} days.`;
  }
  if (linearDays > MAX_TOTAL_VEST_DAYS) {
    return `Thaw duration cannot exceed ${MAX_TOTAL_VEST_DAYS} days.`;
  }
  return null;
}

export const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);
export const MAX_IMAGE_BYTES = 4.3 * 1024 * 1024;

const MAGIC: Array<{ mime: string; bytes: number[] }> = [
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/gif", bytes: [0x47, 0x49, 0x46, 0x38] },
  { mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46] },
];

/** Sniff actual content type from magic bytes; never trust the client mime. */
export function sniffImageMime(bytes: Uint8Array): string | null {
  for (const m of MAGIC) {
    if (m.bytes.every((b, i) => bytes[i] === b)) return m.mime;
  }
  return null;
}
