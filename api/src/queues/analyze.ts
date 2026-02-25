import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema";
import { Bindings } from "../types";

// ── Message shape ─────────────────────────────────────────────────────────────

export interface AnalysisMessage {
  /** ID of the package_evolution row to update once analysis is complete. */
  evolutionId: string;
  /** R2 key for the gzip-compressed base-branch file, or null. */
  mainKey: string | null;
  /** R2 key for the gzip-compressed PR-branch file, or null. */
  prKey: string | null;
}

// ── Decompression ─────────────────────────────────────────────────────────────

/**
 * Decompress a gzip buffer using the Web Streams DecompressionStream API,
 * which is available natively in Cloudflare Workers.
 */
async function gunzip(buffer: ArrayBuffer): Promise<string> {
  const ds = new DecompressionStream("gzip");
  const writer = ds.writable.getWriter();
  writer.write(buffer);
  writer.close();

  const chunks: Uint8Array[] = [];
  const reader = ds.readable.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  const total = chunks.reduce((n, c) => n + c.length, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(merged);
}

// ── Export analysis ───────────────────────────────────────────────────────────

const MAX_EXPORTS = 40;

/**
 * Extract named export identifiers from ESM source text.
 * Works on both unminified and minified bundles because the `export` keyword
 * is always preserved in ESM output.
 */
function parseNamedExports(content: string): string[] {
  const names = new Set<string>();

  // export function foo / export async function foo / export class Foo
  // export const foo / export let foo / export var foo
  for (const [, name] of content.matchAll(
    /\bexport\s+(?:(?:async\s+)?function\s*\*?\s*|class\s+|(?:const|let|var)\s+)([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
  )) {
    if (name !== "default") names.add(name);
  }

  // export { foo, bar as baz, ... }  (with or without trailing 'from "..."')
  for (const [, group] of content.matchAll(/\bexport\s*\{([^}]+)\}/g)) {
    for (const item of group.split(",")) {
      // "foo as bar" → take the external alias "bar"; plain "foo" → take "foo"
      const alias = item.trim().match(/(?:\bas\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)$/);
      if (alias && alias[1] !== "default") names.add(alias[1]);
    }
  }

  return [...names].slice(0, MAX_EXPORTS);
}

/**
 * Estimate how many bytes each named export occupies in the bundled file.
 *
 * Strategy: locate the top-level declaration for each exported name and
 * measure from its start position to the next top-level declaration (or
 * end of file). This is a reliable approximation for pre-bundled ESM where
 * each export is its own self-contained top-level statement.
 *
 * The analysis runs entirely in memory — no filesystem, no subprocess.
 */
function estimateExportSizes(content: string, names: string[]): Record<string, number> | null {
  if (!names.length) return null;

  const positions: { name: string; start: number }[] = [];

  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Patterns that introduce a top-level declaration for `name`
    const patterns = [
      new RegExp(
        `(?:^|\\n)(?:export\\s+)?(?:async\\s+)?function\\s*\\*?\\s*${escaped}\\s*[\\({]`,
        "m",
      ),
      new RegExp(`(?:^|\\n)(?:export\\s+)?class\\s+${escaped}[\\s{(]`, "m"),
      new RegExp(`(?:^|\\n)(?:export\\s+)?(?:const|let|var)\\s+${escaped}\\s*=`, "m"),
    ];

    for (const pattern of patterns) {
      const match = pattern.exec(content);
      if (match?.index !== undefined) {
        // Trim leading newline from the matched position
        const start =
          content[match.index] === "\n" ? match.index + 1 : match.index;
        positions.push({ name, start });
        break;
      }
    }
  }

  if (!positions.length) return null;

  // Sort by ascending position so we can compute ranges between declarations
  positions.sort((a, b) => a.start - b.start);

  const sizes: Record<string, number> = {};
  for (let i = 0; i < positions.length; i++) {
    const end =
      i + 1 < positions.length ? positions[i + 1].start : content.length;
    sizes[positions[i].name] = end - positions[i].start;
  }

  return sizes;
}

// ── Queue handler ─────────────────────────────────────────────────────────────

export async function analyzeHandler(
  batch: MessageBatch<AnalysisMessage>,
  env: Bindings,
): Promise<void> {
  const db = drizzle(env.DB, { schema });

  for (const message of batch.messages) {
    const { evolutionId, mainKey, prKey } = message.body;

    try {
      // Fetch both branch files from R2 in parallel
      const [mainObj, prObj] = await Promise.all([
        mainKey ? env.ARTIFACTS.get(mainKey) : null,
        prKey ? env.ARTIFACTS.get(prKey) : null,
      ]);

      const mainContent = mainObj ? await gunzip(await mainObj.arrayBuffer()) : null;
      const prContent = prObj ? await gunzip(await prObj.arrayBuffer()) : null;

      // Collect all export names visible across both branches
      const mainNames = mainContent ? parseNamedExports(mainContent) : [];
      const prNames = prContent ? parseNamedExports(prContent) : [];
      const allNames = [...new Set([...mainNames, ...prNames])];

      const mainSizes = mainContent ? estimateExportSizes(mainContent, allNames) : null;
      const prSizes = prContent ? estimateExportSizes(prContent, allNames) : null;

      if (!mainSizes && !prSizes) {
        // Nothing to store — file may be CJS/UMD or have no named exports
        await db
          .update(schema.packageEvolution)
          .set({ analysisStatus: "complete" })
          .where(eq(schema.packageEvolution.id, evolutionId));
        message.ack();
        continue;
      }

      await db
        .update(schema.packageEvolution)
        .set({
          exportSizes: JSON.stringify({ main: mainSizes, pr: prSizes }),
          analysisStatus: "complete",
        })
        .where(eq(schema.packageEvolution.id, evolutionId));

      message.ack();
    } catch (err) {
      console.error(`Export analysis failed for evolution ${evolutionId}:`, err);
      // Mark as failed so the UI doesn't keep showing "pending"
      await db
        .update(schema.packageEvolution)
        .set({ analysisStatus: "failed" })
        .where(eq(schema.packageEvolution.id, evolutionId))
        .catch(() => {});
      // retry() will re-deliver the message up to max_retries times
      message.retry();
    }
  }
}
