import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq, and } from "drizzle-orm";
import * as schema from "../db/schema";
import { Bindings } from "../types";

export const report = new Hono<{ Bindings: Bindings }>();

/** SHA-256 hex of a raw API key string. */
async function hashKey(raw: string): Promise<string> {
  const data = new TextEncoder().encode(raw);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Payload sent by the GitHub Action for each PR.
 *
 * One entry exists per output file (per export path per package).
 */
interface ReportPayload {
  /** "owner/repo" identifying the repository. */
  repository: string;
  prNumber: number;
  prTitle?: string;
  branch: string;
  commitSha: string;
  packages: Array<{
    name: string;
    /** Relative path within a monorepo, e.g. "packages/ui". Optional. */
    path?: string;
    exports: Array<{
      /** The export map key, e.g. "." or "./client". */
      exportPath: string;
      files: Array<{
        /** Relative path of the output file, e.g. "dist/index.js". */
        file: string;
        /** Size in bytes on the base (main) branch. */
        mainSize: number;
        /** Size in bytes on the PR branch. */
        prSize: number;
      }>;
    }>;
  }>;
}

/**
 * POST /api/report
 *
 * Authenticated with `Authorization: Bearer <api-key>`.
 * The API key must be scoped to the repository named in the payload.
 *
 * Packages are upserted automatically; evolution records are appended.
 */
report.post("/", async (c) => {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Missing or invalid Authorization header" }, 401);
  }

  const rawKey = authHeader.slice(7).trim();
  if (!rawKey.startsWith("bbt_")) {
    return c.json({ error: "Invalid API key format" }, 401);
  }

  const db = drizzle(c.env.DB, { schema });
  const keyHash = await hashKey(rawKey);

  const keyRecord = await db
    .select()
    .from(schema.apiKey)
    .where(eq(schema.apiKey.keyHash, keyHash))
    .get();

  if (!keyRecord) {
    return c.json({ error: "Invalid API key" }, 401);
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: ReportPayload;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const { repository: repoSlug, prNumber, prTitle, branch, commitSha, packages } = body;

  if (!repoSlug || !prNumber || !branch || !commitSha || !Array.isArray(packages)) {
    return c.json({ error: "Missing required fields: repository, prNumber, branch, commitSha, packages" }, 400);
  }

  // Validate "owner/name" format
  const parts = repoSlug.split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return c.json({ error: "repository must be in owner/name format" }, 400);
  }
  const [owner, name] = parts;

  // ── Verify the API key belongs to this repository ─────────────────────────
  const repo = await db
    .select()
    .from(schema.repository)
    .where(and(eq(schema.repository.owner, owner), eq(schema.repository.name, name)))
    .get();

  if (!repo || repo.id !== keyRecord.repositoryId) {
    return c.json({ error: "API key does not belong to this repository" }, 403);
  }

  // ── Update key last-used timestamp ────────────────────────────────────────
  await db
    .update(schema.apiKey)
    .set({ lastUsedAt: new Date() })
    .where(eq(schema.apiKey.id, keyRecord.id));

  // ── Upsert packages and insert evolution records ──────────────────────────
  const now = new Date();
  const insertedEvolutions: string[] = [];

  for (const pkg of packages) {
    if (!pkg.name) continue;

    // Find or create the package record
    let pkgRecord = await db
      .select()
      .from(schema.package_)
      .where(and(eq(schema.package_.repositoryId, repo.id), eq(schema.package_.name, pkg.name)))
      .get();

    if (!pkgRecord) {
      pkgRecord = {
        id: crypto.randomUUID(),
        repositoryId: repo.id,
        name: pkg.name,
        path: pkg.path ?? null,
        createdAt: now,
        updatedAt: now,
      };
      await db.insert(schema.package_).values(pkgRecord);
    } else if (pkg.path && pkgRecord.path !== pkg.path) {
      await db
        .update(schema.package_)
        .set({ path: pkg.path, updatedAt: now })
        .where(eq(schema.package_.id, pkgRecord.id));
    }

    // Insert evolution records for each file
    for (const exp of pkg.exports ?? []) {
      for (const fileEntry of exp.files ?? []) {
        if (
          typeof fileEntry.mainSize !== "number" ||
          typeof fileEntry.prSize !== "number" ||
          !fileEntry.file
        ) {
          continue;
        }

        const evolutionId = crypto.randomUUID();
        await db.insert(schema.packageEvolution).values({
          id: evolutionId,
          packageId: pkgRecord.id,
          prNumber,
          prTitle: prTitle ?? null,
          branch,
          commitSha,
          exportPath: exp.exportPath,
          fileName: fileEntry.file,
          mainSize: fileEntry.mainSize,
          prSize: fileEntry.prSize,
          reportedAt: now,
        });
        insertedEvolutions.push(evolutionId);
      }
    }
  }

  return c.json({ success: true, recordsCreated: insertedEvolutions.length });
});
