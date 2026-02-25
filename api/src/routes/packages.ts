import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { eq, and, desc } from "drizzle-orm";
import * as schema from "../db/schema";
import { Bindings, Variables } from "../types";

export const packages = new Hono<{ Bindings: Bindings; Variables: Variables }>();

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

// GET /:repoId/packages — list packages for a repository
packages.get("/:repoId/packages", async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const userId = c.get("user")!.id;
  const { repoId } = c.req.param();

  if (!(await assertRepoAccess(db, userId, repoId))) {
    return c.json({ error: "Repository not found" }, 404);
  }

  const pkgs = await db
    .select()
    .from(schema.package_)
    .where(eq(schema.package_.repositoryId, repoId))
    .all();

  return c.json({ packages: pkgs });
});

// GET /:repoId/packages/:packageId/evolutions — bundle size history for a package
packages.get("/:repoId/packages/:packageId/evolutions", async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const userId = c.get("user")!.id;
  const { repoId, packageId } = c.req.param();

  if (!(await assertRepoAccess(db, userId, repoId))) {
    return c.json({ error: "Repository not found" }, 404);
  }

  const [pkg, allEvolutions] = await Promise.all([
    // Verify the package belongs to this repository
    db
      .select()
      .from(schema.package_)
      .where(and(eq(schema.package_.id, packageId), eq(schema.package_.repositoryId, repoId)))
      .get(),
    db
      .select()
      .from(schema.packageEvolution)
      .where(eq(schema.packageEvolution.packageId, packageId))
      .orderBy(desc(schema.packageEvolution.reportedAt))
      .all(),
  ]);

  if (!pkg) {
    return c.json({ error: "Package not found" }, 404);
  }

  const latestCommitByPr = new Map<number, string>();
  const pullRequestsByNumber = new Map<
    number,
    {
      prNumber: number;
      prTitle: string | null;
      branch: string;
      commitSha: string;
      prMerged: boolean;
      prState: "open" | "closed";
      reportedAt: Date;
      evolutions: typeof allEvolutions;
    }
  >();

  for (const evolution of allEvolutions) {
    const latestCommitSha = latestCommitByPr.get(evolution.prNumber);

    if (!latestCommitSha) {
      latestCommitByPr.set(evolution.prNumber, evolution.commitSha);
      pullRequestsByNumber.set(evolution.prNumber, {
        prNumber: evolution.prNumber,
        prTitle: evolution.prTitle,
        branch: evolution.branch,
        commitSha: evolution.commitSha,
        prMerged: Boolean(evolution.prMerged),
        prState: evolution.prState === "closed" ? "closed" : "open",
        reportedAt: evolution.reportedAt,
        evolutions: [evolution],
      });
      continue;
    }

    if (latestCommitSha !== evolution.commitSha) {
      continue;
    }

    const pullRequest = pullRequestsByNumber.get(evolution.prNumber);
    if (pullRequest) {
      pullRequest.evolutions.push(evolution);
    }
  }

  const pullRequests = Array.from(pullRequestsByNumber.values()).sort(
    (a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime(),
  );

  return c.json({ package: pkg, pullRequests });
});

// PATCH /:repoId/packages/:packageId/evolutions/:prNumber — mark PR as merged/closed
packages.patch("/:repoId/packages/:packageId/evolutions/:prNumber", async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const userId = c.get("user")!.id;
  const { repoId, packageId, prNumber: prNumberStr } = c.req.param();
  const prNumber = Number(prNumberStr);

  if (!(await assertRepoAccess(db, userId, repoId))) {
    return c.json({ error: "Repository not found" }, 404);
  }

  const pkg = await db
    .select()
    .from(schema.package_)
    .where(and(eq(schema.package_.id, packageId), eq(schema.package_.repositoryId, repoId)))
    .get();

  if (!pkg) {
    return c.json({ error: "Package not found" }, 404);
  }

  let body: { prMerged?: boolean; prState?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const { prMerged, prState } = body;

  await db
    .update(schema.packageEvolution)
    .set({
      prMerged: prMerged !== undefined ? Boolean(prMerged) : undefined,
      prState: prState === "closed" || prState === "open" ? prState : undefined,
    })
    .where(
      and(
        eq(schema.packageEvolution.packageId, packageId),
        eq(schema.packageEvolution.prNumber, prNumber),
      ),
    );

  return c.json({ success: true });
});

// DELETE /:repoId/packages/:packageId/evolutions/:prNumber — delete all evolutions for a PR
packages.delete("/:repoId/packages/:packageId/evolutions/:prNumber", async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const userId = c.get("user")!.id;
  const { repoId, packageId, prNumber: prNumberStr } = c.req.param();
  const prNumber = Number(prNumberStr);

  if (!(await assertRepoAccess(db, userId, repoId))) {
    return c.json({ error: "Repository not found" }, 404);
  }

  const pkg = await db
    .select()
    .from(schema.package_)
    .where(and(eq(schema.package_.id, packageId), eq(schema.package_.repositoryId, repoId)))
    .get();

  if (!pkg) {
    return c.json({ error: "Package not found" }, 404);
  }

  await db
    .delete(schema.packageEvolution)
    .where(
      and(
        eq(schema.packageEvolution.packageId, packageId),
        eq(schema.packageEvolution.prNumber, prNumber),
      ),
    );

  return c.json({ success: true });
});

// DELETE /:repoId/packages/:packageId — delete a package and all its evolutions
packages.delete("/:repoId/packages/:packageId", async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const userId = c.get("user")!.id;
  const { repoId, packageId } = c.req.param();

  if (!(await assertRepoAccess(db, userId, repoId))) {
    return c.json({ error: "Repository not found" }, 404);
  }

  const pkg = await db
    .select()
    .from(schema.package_)
    .where(and(eq(schema.package_.id, packageId), eq(schema.package_.repositoryId, repoId)))
    .get();

  if (!pkg) {
    return c.json({ error: "Package not found" }, 404);
  }

  await db.delete(schema.package_).where(eq(schema.package_.id, packageId));

  return c.json({ success: true });
});
