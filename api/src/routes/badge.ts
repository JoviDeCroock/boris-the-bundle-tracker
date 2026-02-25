import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq, and, desc, sql } from "drizzle-orm";
import * as schema from "../db/schema";
import { Bindings } from "../types";

export const badge = new Hono<{ Bindings: Bindings }>();

type CompressionMode = "raw" | "gzip" | "brotli";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Approximate pixel width of a monospace character at font-size 11. */
function textWidth(text: string): number {
  return text.length * 6.5;
}

function buildSvg(label: string, value: string, color: string): string {
  const labelW = Math.round(textWidth(label) + 10);
  const valueW = Math.round(textWidth(value) + 10);
  const totalW = labelW + valueW;
  const H = 20;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${H}" role="img" aria-label="${label}: ${value}">
  <title>${label}: ${value}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalW}" height="${H}" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelW}" height="${H}" fill="#555"/>
    <rect x="${labelW}" width="${valueW}" height="${H}" fill="${color}"/>
    <rect width="${totalW}" height="${H}" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="${labelW / 2}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="${labelW / 2}" y="14">${label}</text>
    <text x="${labelW + valueW / 2}" y="15" fill="#010101" fill-opacity=".3">${value}</text>
    <text x="${labelW + valueW / 2}" y="14">${value}</text>
  </g>
</svg>`;
}

/**
 * GET /api/badge/:owner/:repo/:packageName
 *
 * Public (no auth). Returns an SVG badge showing the latest bundle size for a
 * package in a repository.
 *
 * Query params:
 *   compression — "raw" | "gzip" | "brotli"  (default: "gzip")
 *   export      — export path filter, e.g. "."  (default: first export found)
 *   label       — custom badge label  (default: "bundle size")
 */
badge.get("/:owner/:repo/:packageName", async (c) => {
  const { owner, repo, packageName } = c.req.param();
  const compression = (c.req.query("compression") ?? "gzip") as CompressionMode;
  const exportFilter = c.req.query("export") ?? null;
  const label = c.req.query("label") ?? "bundle size";

  const db = drizzle(c.env.DB, { schema });

  // Resolve repository
  const repository = await db
    .select()
    .from(schema.repository)
    .where(
      and(
        sql`lower(${schema.repository.owner}) = lower(${owner})`,
        sql`lower(${schema.repository.name}) = lower(${repo})`,
      ),
    )
    .get();

  if (!repository) {
    return svgError(label, "repo not found");
  }

  // Resolve package (case-insensitive name match)
  const pkg = await db
    .select()
    .from(schema.package_)
    .where(
      and(
        eq(schema.package_.repositoryId, repository.id),
        sql`lower(${schema.package_.name}) = lower(${packageName})`,
      ),
    )
    .get();

  if (!pkg) {
    return svgError(label, "package not found");
  }

  // Fetch latest merged evolution row for this package
  const conditions = exportFilter
    ? and(
        eq(schema.packageEvolution.packageId, pkg.id),
        eq(schema.packageEvolution.prMerged, true),
        eq(schema.packageEvolution.exportPath, exportFilter),
      )
    : and(
        eq(schema.packageEvolution.packageId, pkg.id),
        eq(schema.packageEvolution.prMerged, true),
      );

  const latest = await db
    .select()
    .from(schema.packageEvolution)
    .where(conditions)
    .orderBy(desc(schema.packageEvolution.reportedAt))
    .limit(1)
    .get();

  if (!latest) {
    return svgError(label, "no data");
  }

  // Pick the right size field
  let size: number | null = null;
  if (compression === "gzip") size = latest.gzipPrSize ?? latest.prSize;
  else if (compression === "brotli") size = latest.brotliPrSize ?? latest.prSize;
  else size = latest.prSize;

  if (size == null) size = latest.prSize;

  const valueText = formatBytes(size);
  // Green for small (<50 kB gz), amber for medium (<150 kB), red above
  const color =
    compression === "raw"
      ? "#4c8eda"
      : size < 50 * 1024
        ? "#4c1"
        : size < 150 * 1024
          ? "#e5b100"
          : "#e05d44";

  return c.newResponse(buildSvg(label, valueText, color), 200, {
    "Content-Type": "image/svg+xml",
    "Cache-Control": "public, max-age=3600, s-maxage=3600",
  });
});

function svgError(label: string, message: string) {
  return new Response(buildSvg(label, message, "#9f9f9f"), {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=60",
    },
  });
}
