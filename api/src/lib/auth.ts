import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../db/schema";
import { isProduction } from "../utils/isProduction";

type Env = Cloudflare.Env;

export function createAuth(env: Env) {
  const db = drizzle(env.DB, { schema });

  return betterAuth({
    // We can improve this with CloudFlare KV based rate limits in the future if needed
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
      },
    }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    emailAndPassword: {
      enabled: true,
    },
    trustedOrigins: isProduction(env) ? ["https://boris.resynapse.dev"] : ["http://localhost:5173"],
  });
}
