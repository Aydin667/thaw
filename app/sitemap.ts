import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/launch", "/launches", "/how", "/terms", "/privacy"].map(
    (p) => ({
      url: `${SITE_URL}${p}`,
      changeFrequency: p === "" ? "daily" : "weekly",
      priority: p === "" ? 1 : 0.7,
    }),
  );
}
