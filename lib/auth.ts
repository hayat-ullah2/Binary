import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { db } from "@/lib/db";
import {
  authAccount,
  authSession,
  authUser,
  authVerification,
} from "@/lib/db/auth-schema";

const secret = process.env.BETTER_AUTH_SECRET;
if (!secret || secret.length < 32) {
  throw new Error("BETTER_AUTH_SECRET must be set to at least 32 characters.");
}
const baseURL =
  process.env.BETTER_AUTH_URL ??
  (process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : undefined);
if (!baseURL) {
  throw new Error("BETTER_AUTH_URL must be set in production.");
}

export const auth = betterAuth({
  appName: "SHARP PRO BOT",
  baseURL,
  secret,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: authUser,
      session: authSession,
      account: authAccount,
      verification: authVerification,
    },
  }),
  session: {
    // Cache the session in a signed cookie so getSession (middleware + client)
    // resolves without a DB round-trip on every request. 60s keeps approval /
    // revocation staleness low while removing the per-navigation DB hit.
    cookieCache: { enabled: true, maxAge: 60 },
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  user: {
    additionalFields: {
      approvalStatus: {
        type: "string",
        required: false,
        defaultValue: "PENDING",
        input: false,
      },
      quotexAccountId: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },
});
