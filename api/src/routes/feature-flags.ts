import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema";
import { Bindings, Variables } from "../types";

export const featureFlags = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ── Helpers ────────────────────────────────────────────────────

/**
 * Deterministic FNV-1a 32-bit hash used for percentage-based rollout.
 * Returns a number in [0, 100).
 */
function rolloutBucket(flagName: string, userId: string): number {
  const input = `${flagName}:${userId}`;
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash % 100;
}

function isFlagEnabledForUser(
  flag: typeof schema.featureFlag.$inferSelect,
  userId: string,
): boolean {
  if (!flag.enabled) return false;

  // Explicit allowlist takes priority
  if (flag.allowedUserIds) {
    const allowed = JSON.parse(flag.allowedUserIds) as string[];
    if (allowed.includes(userId)) return true;
  }

  // Percentage-based rollout
  if (flag.rolloutPercentage > 0) {
    return rolloutBucket(flag.name, userId) < flag.rolloutPercentage;
  }

  return false;
}

function isAdmin(env: Bindings, email: string): boolean {
  const adminEmails = env.ADMIN_EMAILS;
  if (!adminEmails) return false;
  return adminEmails
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .includes(email.toLowerCase());
}

// ── User-facing route ──────────────────────────────────────────

/**
 * GET /api/v1/feature-flags
 * Returns the list of flag names that are currently enabled for the
 * authenticated user. Use this on the frontend to gate features.
 */
featureFlags.get("/", async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const userId = c.get("user")!.id;

  const flags = await db.select().from(schema.featureFlag).all();

  const enabledFlags = flags
    .filter((flag) => isFlagEnabledForUser(flag, userId))
    .map((flag) => flag.name);

  return c.json({ flags: enabledFlags });
});

// ── Admin routes ───────────────────────────────────────────────

featureFlags.use("/admin/*", async (c, next) => {
  const user = c.get("user")!;
  if (!isAdmin(c.env, user.email)) {
    return c.json({ error: "Forbidden" }, 403);
  }
  await next();
});

/**
 * GET /api/v1/feature-flags/admin
 * Lists all feature flags with their full configuration.
 */
featureFlags.get("/admin", async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const flags = await db.select().from(schema.featureFlag).all();
  return c.json({ flags });
});

/**
 * POST /api/v1/feature-flags/admin
 * Creates a new feature flag.
 * Body: { name, description?, enabled?, allowedUserIds?, rolloutPercentage? }
 */
featureFlags.post("/admin", async (c) => {
  const db = drizzle(c.env.DB, { schema });

  let body: {
    name?: string;
    description?: string;
    enabled?: boolean;
    allowedUserIds?: string[];
    rolloutPercentage?: number;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const name = body.name?.trim();
  if (!name || !/^[\w-]+$/.test(name)) {
    return c.json({ error: "name is required and must be alphanumeric with hyphens/underscores" }, 400);
  }

  const rolloutPercentage = body.rolloutPercentage ?? 0;
  if (rolloutPercentage < 0 || rolloutPercentage > 100) {
    return c.json({ error: "rolloutPercentage must be between 0 and 100" }, 400);
  }

  const now = new Date();
  const flag = {
    id: crypto.randomUUID(),
    name,
    description: body.description ?? null,
    enabled: body.enabled ?? false,
    allowedUserIds: body.allowedUserIds ? JSON.stringify(body.allowedUserIds) : null,
    rolloutPercentage,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await db.insert(schema.featureFlag).values(flag);
  } catch {
    return c.json({ error: "A flag with that name already exists" }, 409);
  }

  return c.json({ flag }, 201);
});

/**
 * PATCH /api/v1/feature-flags/admin/:name
 * Updates an existing feature flag.
 * Body: { description?, enabled?, allowedUserIds?, rolloutPercentage? }
 */
featureFlags.patch("/admin/:name", async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const flagName = c.req.param("name");

  const existing = await db
    .select()
    .from(schema.featureFlag)
    .where(eq(schema.featureFlag.name, flagName))
    .get();

  if (!existing) {
    return c.json({ error: "Feature flag not found" }, 404);
  }

  let body: {
    description?: string | null;
    enabled?: boolean;
    allowedUserIds?: string[] | null;
    rolloutPercentage?: number;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  if (body.rolloutPercentage !== undefined) {
    if (body.rolloutPercentage < 0 || body.rolloutPercentage > 100) {
      return c.json({ error: "rolloutPercentage must be between 0 and 100" }, 400);
    }
  }

  const updates: Partial<typeof schema.featureFlag.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (body.description !== undefined) updates.description = body.description;
  if (body.enabled !== undefined) updates.enabled = body.enabled;
  if (body.allowedUserIds !== undefined) {
    updates.allowedUserIds = body.allowedUserIds ? JSON.stringify(body.allowedUserIds) : null;
  }
  if (body.rolloutPercentage !== undefined) updates.rolloutPercentage = body.rolloutPercentage;

  await db
    .update(schema.featureFlag)
    .set(updates)
    .where(eq(schema.featureFlag.name, flagName));

  const updated = await db
    .select()
    .from(schema.featureFlag)
    .where(eq(schema.featureFlag.name, flagName))
    .get();

  return c.json({ flag: updated });
});

/**
 * DELETE /api/v1/feature-flags/admin/:name
 * Deletes a feature flag.
 */
featureFlags.delete("/admin/:name", async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const flagName = c.req.param("name");

  const existing = await db
    .select()
    .from(schema.featureFlag)
    .where(eq(schema.featureFlag.name, flagName))
    .get();

  if (!existing) {
    return c.json({ error: "Feature flag not found" }, 404);
  }

  await db.delete(schema.featureFlag).where(eq(schema.featureFlag.name, flagName));

  return c.json({ success: true });
});
