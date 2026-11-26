import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  envDir: fileURLToPath(new URL(".", import.meta.url))
});
