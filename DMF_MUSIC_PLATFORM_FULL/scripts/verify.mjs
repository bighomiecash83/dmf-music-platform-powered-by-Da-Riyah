const BACKEND = process.env.VERIFY_BACKEND ?? "http://localhost:5001";
const WEB = process.env.VERIFY_WEB ?? "http://localhost:3001";
const WEB_PATH = process.env.VERIFY_WEB_PATH ?? "/dashboard";

async function get(url) {
  const r = await fetch(url, { method: "GET" });
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: r.status, text, json };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

(async () => {
  const h = await get(`${BACKEND}/api/health`);
  assert(h.status === 200, `backend /api/health ${h.status}: ${h.text}`);
  assert(h.json?.ok === true, `backend /api/health not ok: ${h.text}`);

  const web = await get(`${WEB}${WEB_PATH}`);
  assert(web.status === 200, `web ${WEB_PATH} ${web.status}: ${web.text}`);

  if (process.env.DMF_API_KEY && process.env.DA_RIYAH_MASTER_KEY && process.env.API_BASE) {
    const ph = await get(`${WEB}/api/proxy?path=${encodeURIComponent("/health")}`);
    assert(ph.status === 200, `web proxy /health ${ph.status}: ${ph.text}`);
  } else {
    console.log("VERIFY WARN: proxy env vars missing; skipping /api/proxy check");
  }

  console.log("VERIFY OK");
})().catch((e) => {
  console.error("VERIFY FAIL");
  console.error(String(e?.message ?? e));
  process.exit(1);
});
