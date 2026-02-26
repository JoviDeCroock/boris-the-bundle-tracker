import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq, and } from "drizzle-orm";
import * as schema from "../db/schema";
import { Bindings, Variables } from "../types";

export const personas = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// GET / — list all personas for the authenticated user (with their linked repository)
personas.get("/", async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const userId = c.get("user")!.id;

  const rows = await db
    .select({
      id: schema.persona.id,
      name: schema.persona.name,
      description: schema.persona.description,
      repositoryId: schema.persona.repositoryId,
      repositoryOwner: schema.repository.owner,
      repositoryName: schema.repository.name,
      createdAt: schema.persona.createdAt,
      updatedAt: schema.persona.updatedAt,
    })
    .from(schema.persona)
    .leftJoin(schema.repository, eq(schema.persona.repositoryId, schema.repository.id))
    .where(eq(schema.persona.userId, userId))
    .all();

  const result = rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    repositoryId: r.repositoryId,
    repository:
      r.repositoryOwner && r.repositoryName
        ? { owner: r.repositoryOwner, name: r.repositoryName }
        : null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));

  return c.json({ personas: result });
});

// POST / — create a new persona
// Body: { name: string; description?: string; repoOwner?: string; repoName?: string }
personas.post("/", async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const userId = c.get("user")!.id;

  let body: { name?: string; description?: string; repoOwner?: string; repoName?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const name = body.name?.trim();
  if (!name) {
    return c.json({ error: "name is required" }, 400);
  }

  const now = new Date();
  let repositoryId: string | null = null;

  // Optionally link a repository
  if (body.repoOwner && body.repoName) {
    const owner = body.repoOwner.trim();
    const repoName = body.repoName.trim();

    const validIdent = /^[\w.\-]+$/;
    if (!validIdent.test(owner) || !validIdent.test(repoName)) {
      return c.json({ error: "repoOwner and repoName must be valid GitHub identifiers" }, 400);
    }

    // Find or create the repository
    let repo = await db
      .select()
      .from(schema.repository)
      .where(and(eq(schema.repository.owner, owner), eq(schema.repository.name, repoName)))
      .get();

    if (!repo) {
      const newRepo = {
        id: crypto.randomUUID(),
        owner,
        name: repoName,
        createdAt: now,
        updatedAt: now,
      };
      await db.insert(schema.repository).values(newRepo);
      repo = newRepo;
    }

    // Ensure the user is linked to the repository
    const existingLink = await db
      .select()
      .from(schema.userRepository)
      .where(
        and(
          eq(schema.userRepository.userId, userId),
          eq(schema.userRepository.repositoryId, repo.id),
        ),
      )
      .get();

    if (!existingLink) {
      await db.insert(schema.userRepository).values({
        userId,
        repositoryId: repo.id,
        createdAt: now,
      });
    }

    repositoryId = repo.id;
  }

  const newPersona = {
    id: crypto.randomUUID(),
    userId,
    name,
    description: body.description?.trim() || null,
    repositoryId,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(schema.persona).values(newPersona);

  // Fetch the linked repository details for the response
  let repository: { owner: string; name: string } | null = null;
  if (repositoryId) {
    const repo = await db
      .select({ owner: schema.repository.owner, name: schema.repository.name })
      .from(schema.repository)
      .where(eq(schema.repository.id, repositoryId))
      .get();
    repository = repo ?? null;
  }

  return c.json(
    {
      persona: {
        id: newPersona.id,
        name: newPersona.name,
        description: newPersona.description,
        repositoryId: newPersona.repositoryId,
        repository,
        createdAt: newPersona.createdAt,
        updatedAt: newPersona.updatedAt,
      },
    },
    201,
  );
});

// GET /:id — get a single persona (must belong to the authenticated user)
personas.get("/:id", async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const userId = c.get("user")!.id;
  const personaId = c.req.param("id");

  const rows = await db
    .select({
      id: schema.persona.id,
      name: schema.persona.name,
      description: schema.persona.description,
      repositoryId: schema.persona.repositoryId,
      repositoryOwner: schema.repository.owner,
      repositoryName: schema.repository.name,
      createdAt: schema.persona.createdAt,
      updatedAt: schema.persona.updatedAt,
    })
    .from(schema.persona)
    .leftJoin(schema.repository, eq(schema.persona.repositoryId, schema.repository.id))
    .where(and(eq(schema.persona.id, personaId), eq(schema.persona.userId, userId)))
    .all();

  if (rows.length === 0) {
    return c.json({ error: "Persona not found" }, 404);
  }

  const r = rows[0];
  return c.json({
    persona: {
      id: r.id,
      name: r.name,
      description: r.description,
      repositoryId: r.repositoryId,
      repository:
        r.repositoryOwner && r.repositoryName
          ? { owner: r.repositoryOwner, name: r.repositoryName }
          : null,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    },
  });
});

// DELETE /:id — delete a persona
personas.delete("/:id", async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const userId = c.get("user")!.id;
  const personaId = c.req.param("id");

  const existing = await db
    .select()
    .from(schema.persona)
    .where(and(eq(schema.persona.id, personaId), eq(schema.persona.userId, userId)))
    .get();

  if (!existing) {
    return c.json({ error: "Persona not found" }, 404);
  }

  await db
    .delete(schema.persona)
    .where(and(eq(schema.persona.id, personaId), eq(schema.persona.userId, userId)));

  return c.json({ success: true });
});
