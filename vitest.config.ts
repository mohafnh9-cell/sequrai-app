import path from "node:path";
import { defineConfig } from "vitest/config";

const serverOnlyMock = path.resolve(__dirname, "test/mocks/server-only.ts");

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "server-only": serverOnlyMock,
    },
  },
  test: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "server-only": serverOnlyMock,
    },
  },
});
