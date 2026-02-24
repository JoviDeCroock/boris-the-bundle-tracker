import { sqliteTable, text, integer, index, primaryKey } from "drizzle-orm/sqlite-core";

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", {
    mode: "timestamp",
  }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", {
    mode: "timestamp",
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// ── Verification ────────────────────────────────────────────

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

// ── Repositories ──────────────────────────────────────────────

/**
 * A GitHub repository tracked by Boris.
 * Users link their own repositories; one repository can be linked by many users.
 */
export const repository = sqliteTable("repository", {
  id: text("id").primaryKey(),
  name: text("name").notNull(), // e.g. "my-repo"
  owner: text("owner").notNull(), // GitHub org or user, e.g. "my-org"
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

/**
 * Many-to-many join between users and repositories.
 */
export const userRepository = sqliteTable(
  "user_repository",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    repositoryId: text("repository_id")
      .notNull()
      .references(() => repository.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.repositoryId] }),
    index("user_repository_user_idx").on(t.userId),
  ],
);

/**
 * API keys scoped to a repository.
 * Used by the GitHub Action to authenticate bundle-size reports.
 * The full key is shown only once at creation time; only its SHA-256 hash is stored.
 */
export const apiKey = sqliteTable(
  "api_key",
  {
    id: text("id").primaryKey(),
    repositoryId: text("repository_id")
      .notNull()
      .references(() => repository.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // human-readable label
    keyHash: text("key_hash").notNull().unique(), // SHA-256 hex of the raw key
    keyPrefix: text("key_prefix").notNull(), // first 12 chars for display, e.g. "bbt_xxxx…"
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    lastUsedAt: integer("last_used_at", { mode: "timestamp" }),
  },
  (t) => [index("api_key_repository_idx").on(t.repositoryId)],
);

/**
 * An npm package (or workspace package) inside a repository.
 * Packages are created automatically when the GitHub Action first reports sizes.
 */
export const package_ = sqliteTable(
  "package",
  {
    id: text("id").primaryKey(),
    repositoryId: text("repository_id")
      .notNull()
      .references(() => repository.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // package name from package.json
    path: text("path"), // relative path within a monorepo (optional)
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [index("package_repository_idx").on(t.repositoryId)],
);

/**
 * A single bundle-size data point recorded for a package on a given PR.
 * One record exists per (package, PR, exportPath, file) combination.
 */
export const packageEvolution = sqliteTable(
  "package_evolution",
  {
    id: text("id").primaryKey(),
    packageId: text("package_id")
      .notNull()
      .references(() => package_.id, { onDelete: "cascade" }),
    prNumber: integer("pr_number").notNull(),
    prTitle: text("pr_title"),
    branch: text("branch").notNull(),
    commitSha: text("commit_sha").notNull(),
    exportPath: text("export_path").notNull(), // e.g. "." or "./client"
    fileName: text("file_name").notNull(), // e.g. "dist/index.js"
    mainSize: integer("main_size").notNull(), // bytes on base branch
    prSize: integer("pr_size").notNull(), // bytes on PR branch
    reportedAt: integer("reported_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [
    index("package_evolution_package_idx").on(t.packageId),
    index("package_evolution_pr_idx").on(t.packageId, t.prNumber),
  ],
);

// ── Subscriptions ─────────────────────────────────────────────

export const subscription = sqliteTable(
  "subscription",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    polarCustomerId: text("polar_customer_id"),
    polarSubscriptionId: text("polar_subscription_id"),
    plan: text("plan").notNull().default("free"), // 'free' | 'pro'
    status: text("status").notNull().default("active"), // 'active' | 'canceled' | 'expired'
    currentPeriodEnd: integer("current_period_end", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [index("subscription_user_idx").on(t.userId)],
);
