import { eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "../db/schema";

type Plan = "free" | "pro";

export const PLAN_LIMITS = {
  free: {
    /** Maximum number of repositories the user can link. */
    repositories: 3,
    /** Maximum number of API keys per repository. */
    apiKeysPerRepo: 2,
    /** How many days of evolution history are retained. */
    historyDays: 30,
  },
  pro: {
    repositories: 50,
    apiKeysPerRepo: 10,
    historyDays: 365,
  },
} as const;

export async function getUserPlan(
  db: DrizzleD1Database<typeof schema>,
  userId: string,
): Promise<Plan> {
  const row = await db
    .select({ plan: schema.subscription.plan })
    .from(schema.subscription)
    .where(eq(schema.subscription.userId, userId))
    .get();

  if (!row || row.plan !== "pro") return "free";
  return "pro";
}
