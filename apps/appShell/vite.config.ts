import { defineConfig } from "vite";
import { alphaTab } from "@coderline/alphatab-vite";
import { mkdir, appendFile } from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import type { Plugin } from "vite";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;
// @ts-expect-error process is a nodejs global
const tauriPlatform = process.env.TAURI_ENV_PLATFORM;
const isAndroid = tauriPlatform === "android";

function songStepAndroidDevHostLogPlugin(): Plugin {
  let activeFilePath: string | null = null;

  const buildFilePath = (directory: string): string =>
    path.join(directory, `songstep-android-dev-session-${Date.now()}.jsonl`);

  const resolveLogPath = async (): Promise<string> => {
    const candidates = process.platform === "win32"
      ? ["C:\\Programs\\songStep\\debug", path.join(os.tmpdir(), "songStep", "debug")]
      : [path.join(os.tmpdir(), "songStep", "debug")];
    for (const directory of candidates) {
      try {
        await mkdir(directory, { recursive: true });
        const filePath = buildFilePath(directory);
        await appendFile(filePath, "");
        return filePath;
      } catch {
        // Try next candidate.
      }
    }
    throw new Error("unable to initialize android dev host log path");
  };

  const appendJsonl = async (event: Record<string, unknown>): Promise<void> => {
    if (!activeFilePath) {
      return;
    }
    await appendFile(activeFilePath, `${JSON.stringify(event)}\n`);
  };

  return {
    name: "songstep-android-dev-host-log",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/__songstep/dev-log/init", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end("Method Not Allowed");
          return;
        }
        void (async () => {
          try {
            if (!activeFilePath) {
              activeFilePath = await resolveLogPath();
              await appendJsonl({
                type: "host-log-path",
                path: activeFilePath,
                timestamp: new Date().toISOString(),
                platform: "android-dev-host",
              });
            }
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ path: activeFilePath }));
          } catch (error) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                error: error instanceof Error ? error.message : String(error),
              }),
            );
          }
        })();
      });

      server.middlewares.use("/__songstep/dev-log/append", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end("Method Not Allowed");
          return;
        }
        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });
        req.on("end", () => {
          void (async () => {
            try {
              if (!activeFilePath) {
                activeFilePath = await resolveLogPath();
                await appendJsonl({
                  type: "host-log-path",
                  path: activeFilePath,
                  timestamp: new Date().toISOString(),
                  platform: "android-dev-host",
                });
              }
              const parsedBody = body.length > 0 ? (JSON.parse(body) as Record<string, unknown>) : {};
              await appendJsonl(parsedBody);
              res.statusCode = 204;
              res.end();
            } catch {
              // Keep this sink non-fatal for clients.
              res.statusCode = 204;
              res.end();
            }
          })();
        });
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [alphaTab(), songStepAndroidDevHostLogPlugin()],
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
