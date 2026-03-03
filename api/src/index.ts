import { Hono } from "hono";
import { cors } from "hono/cors";
import { createAuth } from "./lib/auth";
import { subscription } from "./routes/subscription";
import { repositories } from "./routes/repositories";
import { apiKeys } from "./routes/api-keys";
import { packages } from "./routes/packages";
import { report } from "./routes/report";
import { badge } from "./routes/badge";
import { featureFlags } from "./routes/feature-flags";
import { Bindings, Variables } from "./types";
import { isProduction } from "./utils/isProduction";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Security response headers
app.use("/api/*", async (c, next) => {
  await next();
  c.res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  c.res.headers.set("X-Content-Type-Options", "nosniff");
  c.res.headers.set("X-Frame-Options", "DENY");
  c.res.headers.set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
});

// CORS — allow the frontend origin and credentials (cookies)
app.use(
  "/api/*",
  cors({
    origin: (origin, c) =>
      isProduction(c.env) ? "https://boris.resynapse.dev" : "http://localhost:5173",
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  }),
);

// Mount BetterAuth handler
app.on(["GET", "POST"], "/api/auth/*", (c) => {
  try {
    const auth = createAuth(c.env);
    return auth.handler(c.req.raw);
  } catch (error) {
    console.error("Error in auth handler:", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

// Session middleware for protected routes
app.use("/api/v1/*", async (c, next) => {
  const auth = createAuth(c.env);
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  c.set("user", session.user);
  c.set("session", session.session);
  await next();
});

// Health check
app.get("/", (c) => {
  return c.json({ status: "ok" });
});

// Example protected route
app.get("/api/v1/me", (c) => {
  return c.json({ user: c.get("user") });
});

// Subscription
app.route("/api/v1/subscription", subscription);

// Repositories & related resources (session-protected via middleware above)
app.route("/api/v1/repositories", repositories);
app.route("/api/v1/repositories", apiKeys);
app.route("/api/v1/repositories", packages);

// Feature flags — user view + admin CRUD
app.route("/api/v1/feature-flags", featureFlags);

// Bundle-size report endpoint — authenticated via Bearer API key (not session)
app.route("/api/report", report);

// Public SVG badge endpoint — no auth required
app.route("/api/badge", badge);

export default app;
