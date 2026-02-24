import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq, and } from "drizzle-orm";
import * as schema from "../db/schema";
import { Bindings, Variables } from "../types";

export const repositories = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// GET / — list repositories the authenticated user has linked
repositories.get("/", async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const userId = c.get("user")!.id;

  const rows = await db
    .select({
      id: schema.repository.id,
      name: schema.repository.name,
      owner: schema.repository.owner,
      createdAt: schema.repository.createdAt,
      updatedAt: schema.repository.updatedAt,
    })
    .from(schema.userRepository)
    .innerJoin(schema.repository, eq(schema.userRepository.repositoryId, schema.repository.id))
    .where(eq(schema.userRepository.userId, userId))
    .all();

  return c.json({ repositories: rows });
});

// POST / — link a repository to the authenticated user
// Body: { owner: string; name: string }
repositories.post("/", async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const userId = c.get("user")!.id;

  let body: { owner?: string; name?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const owner = body.owner?.trim();
  const name = body.name?.trim();

  if (!owner || !name) {
    return c.json({ error: "owner and name are required" }, 400);
  }

  // Validate format: only alphanumeric, hyphens, dots, underscores
  const validIdent = /^[\w.\-]+$/;
  if (!validIdent.test(owner) || !validIdent.test(name)) {
    return c.json({ error: "owner and name must be valid GitHub identifiers" }, 400);
  }

  const now = new Date();

  // Find existing repository or create a new one
  let repo = await db
    .select()
    .from(schema.repository)
    .where(and(eq(schema.repository.owner, owner), eq(schema.repository.name, name)))
    .get();

  if (!repo) {
    const newRepo = {
      id: crypto.randomUUID(),
      owner,
      name,
      createdAt: now,
      updatedAt: now,
    };
    await db.insert(schema.repository).values(newRepo);
    repo = newRepo;
  }

  // Check if user already linked this repository
  const existing = await db
    .select()
    .from(schema.userRepository)
    .where(
      and(
        eq(schema.userRepository.userId, userId),
        eq(schema.userRepository.repositoryId, repo.id),
      ),
    )
    .get();

  if (existing) {
    return c.json({ error: "Repository already linked to your account" }, 409);
  }

  await db.insert(schema.userRepository).values({
    userId,
    repositoryId: repo.id,
    createdAt: now,
  });

  return c.json({ repository: repo }, 201);
});

// DELETE /:id — unlink a repository from the authenticated user
repositories.delete("/:id", async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const userId = c.get("user")!.id;
  const repositoryId = c.req.param("id");

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

  if (!link) {
    return c.json({ error: "Repository not found" }, 404);
  }

  await db
    .delete(schema.userRepository)
    .where(
      and(
        eq(schema.userRepository.userId, userId),
        eq(schema.userRepository.repositoryId, repositoryId),
      ),
    );

  return c.json({ success: true });
});
