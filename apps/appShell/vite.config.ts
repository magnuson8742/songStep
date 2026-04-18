import { defineConfig } from "vite";
import { alphaTab } from "@coderline/alphatab-vite";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;
// @ts-expect-error process is a nodejs global
const tauriPlatform = process.env.TAURI_ENV_PLATFORM;
const isAndroid = tauriPlatform === "android";

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [alphaTab()],
  optimizeDeps: {
    exclude: ["@coderline/alphatab", "@coderline/alphatab-vite"],
    noDiscovery: true,
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || (isAndroid ? "0.0.0.0" : false),
    hmr: isAndroid
      ? false
      : host
      ? {
          protocol: "ws",
          host,
          port: 1421,
          clientPort: 1421,
        }
      : false,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
