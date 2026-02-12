import { spawn } from "node:child_process";

const BACKEND_URL = process.env.VERIFY_BACKEND ?? "http://localhost:5001/api/health";
const WEB_URL = process.env.VERIFY_WEB ?? "http://localhost:3001";
const VERIFY_CMD = "node";
const VERIFY_ARGS = ["scripts/verify.mjs"];

const pnpmCmd = "pnpm";

function spawnProc(cmd, args, name) {
  const child = spawn(cmd, args, {
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });
  child.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`[${name}] exited with code ${code}`);
      process.exit(code);
    }
  });
  return child;
}

async function waitFor(url, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { method: "GET" });
      if (res.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Timeout waiting for ${url}`);
}

async function main() {
  const backend = spawnProc("node", ["functions/server.js"], "backend");
  const web = spawnProc(pnpmCmd, ["--filter", "@dariyah/web", "dev"], "web");

  process.on("SIGINT", () => {
    backend.kill("SIGINT");
    web.kill("SIGINT");
    process.exit(0);
  });

  await waitFor(BACKEND_URL);
  await waitFor(WEB_URL);

  spawnProc(VERIFY_CMD, VERIFY_ARGS, "verify");
}

main().catch((err) => {
  console.error("UP FAIL");
  console.error(err?.message ?? err);
  process.exit(1);
});
