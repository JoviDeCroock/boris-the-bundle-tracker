import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { eq, and } from "drizzle-orm";
import * as schema from "../db/schema";
import { Bindings, Variables } from "../types";

export const apiKeys = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/** Derive SHA-256 hex string from a raw API key string. */
async function hashKey(raw: string): Promise<string> {
  const data = new TextEncoder().encode(raw);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Generate a new random API key in the format `bbt_<64 hex chars>`. */
function generateKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `bbt_${hex}`;
}

/** Assert the requesting user has access to the given repository. */
async function assertRepoAccess(
  db: DrizzleD1Database<typeof schema>,
  userId: string,
  repositoryId: string,
) {
  const link = await db
    .select()
    .from(schema.userRepository)
    .where(
      and(
        eq(schema.userRepository.userId, userId),
        eq(schema.userRepository.repositoryId, repositoryId),
      ),
    )
    .get();
  return !!link;
}

// GET /:repoId/api-keys — list API keys for a repository (no secret values returned)
apiKeys.get("/:repoId/api-keys", async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const userId = c.get("user")!.id;
  const { repoId } = c.req.param();

  if (!(await assertRepoAccess(db, userId, repoId))) {
    return c.json({ error: "Repository not found" }, 404);
  }

  const keys = await db
    .select({
      id: schema.apiKey.id,
      name: schema.apiKey.name,
      keyPrefix: schema.apiKey.keyPrefix,
      createdAt: schema.apiKey.createdAt,
      lastUsedAt: schema.apiKey.lastUsedAt,
    })
    .from(schema.apiKey)
    .where(eq(schema.apiKey.repositoryId, repoId))
    .all();

  return c.json({ apiKeys: keys });
});

// POST /:repoId/api-keys — create a new API key
// Body: { name: string }
// Returns the full key ONCE — it cannot be retrieved again.
apiKeys.post("/:repoId/api-keys", async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const userId = c.get("user")!.id;
  const { repoId } = c.req.param();

  if (!(await assertRepoAccess(db, userId, repoId))) {
    return c.json({ error: "Repository not found" }, 404);
  }

  let body: { name?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const name = body.name?.trim();
  if (!name) {
    return c.json({ error: "name is required" }, 400);
  }

  const rawKey = generateKey();
  const keyHash = await hashKey(rawKey);
  // Display prefix: "bbt_" + first 8 hex chars + "…"
  const keyPrefix = rawKey.slice(0, 12) + "…";

  const now = new Date();
  const record = {
    id: crypto.randomUUID(),
    repositoryId: repoId,
    name,
    keyHash,
    keyPrefix,
    createdAt: now,
    lastUsedAt: null,
  };

  await db.insert(schema.apiKey).values(record);

  return c.json(
    {
      apiKey: {
        id: record.id,
        name: record.name,
        keyPrefix: record.keyPrefix,
        createdAt: record.createdAt,
        lastUsedAt: null,
        // Full key shown ONCE here
        key: rawKey,
      },
    },
    201,
  );
});

// DELETE /:repoId/api-keys/:keyId — delete an API key
apiKeys.delete("/:repoId/api-keys/:keyId", async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const userId = c.get("user")!.id;
  const { repoId, keyId } = c.req.param();

  if (!(await assertRepoAccess(db, userId, repoId))) {
    return c.json({ error: "Repository not found" }, 404);
  }

  const key = await db
    .select()
    .from(schema.apiKey)
    .where(and(eq(schema.apiKey.id, keyId), eq(schema.apiKey.repositoryId, repoId)))
    .get();

  if (!key) {
    return c.json({ error: "API key not found" }, 404);
  }

  await db.delete(schema.apiKey).where(eq(schema.apiKey.id, keyId));

  return c.json({ success: true });
});
