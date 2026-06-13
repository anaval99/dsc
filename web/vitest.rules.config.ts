import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Security-rules tests talk to the Firestore emulator. They are skipped
// automatically when FIRESTORE_EMULATOR_HOST is not set (see tests/rules).
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["tests/rules/**/*.test.ts"],
    // Emulator round-trips can be slow on cold start.
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
