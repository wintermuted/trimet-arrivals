import autoprefixer from "autoprefixer";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const publicUrl = (env.PUBLIC_URL || "").replace(/\/+$/, "");

  return {
    base: `${publicUrl}/`,
    build: { outDir: "build" },
    css: { postcss: { plugins: [autoprefixer()] } },
    define: {
      "process.env.PUBLIC_URL": JSON.stringify(publicUrl),
      "process.env.REACT_APP_USE_DEFAULT_PORTLAND_LOCATION": JSON.stringify(
        env.REACT_APP_USE_DEFAULT_PORTLAND_LOCATION
      ),
      "process.env.REACT_APP_USE_FIXTURE": JSON.stringify(
        env.REACT_APP_USE_FIXTURE
      )
    },
    plugins: [react()],
    resolve: {
      alias: {
        "!mapbox-gl": "mapbox-gl"
      }
    }
  };
});
