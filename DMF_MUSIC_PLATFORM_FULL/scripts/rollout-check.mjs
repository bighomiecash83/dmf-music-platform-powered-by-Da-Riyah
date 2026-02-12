import { spawn, spawnSync } from "node:child_process";
import net from "node:net";

const BACKEND = process.env.ROLLOUT_BACKEND ?? "http://localhost:5001";
const WEB = process.env.ROLLOUT_WEB ?? "http://localhost:3000";
const WEB_PATH = process.env.ROLLOUT_WEB_PATH ?? "/dashboard";
const HEALTH_TIMEOUT_MS = Number(process.env.ROLLOUT_TIMEOUT_MS ?? 90000);
const pnpmCmd = "pnpm";
const backendPort = new URL(BACKEND).port || "5001";
const webPort = new URL(WEB).port || "3000";
const backendHost = new URL(BACKEND).hostname;
const webHost = new URL(WEB).hostname;
let isShuttingDown = false;

function spawnProc(cmd, args, name, env = process.env) {
  const child = spawn(cmd, args, {
    stdio: "inherit",
    env,
    shell: process.platform === "win32",
  });
  child.on("exit", (code) => {
    if (isShuttingDown) return;
    if (code && code !== 0) {
      console.error(`[${name}] exited with code ${code}`);
      process.exit(code);
    }
  });
  return child;
}

async function waitFor(url, timeoutMs = HEALTH_TIMEOUT_MS) {
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

async function get(url) {
  const r = await fetch(url, { method: "GET" });
  const text = await r.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: r.status, text, json };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function stopChildren(children) {
  isShuttingDown = true;
  for (const child of children) {
    if (!child?.pid) continue;
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
        shell: true,
      });
      continue;
    }
    if (!child.killed) {
      child.kill("SIGINT");
    }
  }
}

async function assertPortFree(host, port, label) {
  await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        reject(new Error(`${label} port ${port} is already in use on ${host}`));
        return;
      }
      reject(err);
    });
    server.listen(Number(port), host, () => {
      server.close(resolve);
    });
  });
}

async function main() {
  await assertPortFree(backendHost, backendPort, "Backend");
  await assertPortFree(webHost, webPort, "Web");

  const children = [];
  const backend = spawnProc("node", ["functions/server.js"], "backend", {
    ...process.env,
    PORT: backendPort,
  });
  const web = spawnProc(
    pnpmCmd,
    ["--filter", "@dariyah/web", "exec", "next", "start", "-p", webPort],
    "web",
  );
  children.push(backend, web);

  process.on("SIGINT", () => {
    stopChildren(children);
    process.exit(1);
  });

  await waitFor(`${BACKEND}/api/health`);
  await waitFor(`${WEB}${WEB_PATH}`);

  const h = await get(`${BACKEND}/api/health`);
  assert(h.status === 200, `backend /api/health ${h.status}: ${h.text}`);
  assert(h.json?.ok === true, `backend /api/health not ok: ${h.text}`);

  const webCheck = await get(`${WEB}${WEB_PATH}`);
  assert(webCheck.status === 200, `web ${WEB_PATH} ${webCheck.status}: ${webCheck.text}`);

  if (process.env.DMF_API_KEY && process.env.DA_RIYAH_MASTER_KEY && process.env.API_BASE) {
    const ph = await get(`${WEB}/api/proxy?path=${encodeURIComponent("/health")}`);
    assert(ph.status === 200, `web proxy /health ${ph.status}: ${ph.text}`);
  } else {
    console.log("VERIFY WARN: proxy env vars missing; skipping /api/proxy check");
  }

  console.log("VERIFY OK");
  stopChildren(children);
}

main().catch((err) => {
  console.error("ROLLOUT CHECK FAIL");
  console.error(err?.message ?? err);
  process.exit(1);
});
