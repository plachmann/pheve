import { config as loadEnv } from "dotenv";
import { defineConfig } from "@playwright/test";

// Load the same env the dev server sees. Load the dev-local DB first so it wins for
// DATABASE_URL (dotenv never overrides an already-set var), then .env.local for the
// Stripe keys — matching Next.js's own precedence.
loadEnv({ path: ".env.development.local" });
loadEnv({ path: ".env.local" });

const port = Number(process.env["E2E_PORT"] ?? 3000);
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  use: { baseURL },
  webServer: {
    command: `pnpm dev --port ${port}`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
