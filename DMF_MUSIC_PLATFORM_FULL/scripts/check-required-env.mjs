const required = (process.env.REQUIRED_ENV_VARS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (!required.length) {
  console.error("No REQUIRED_ENV_VARS provided");
  process.exit(1);
}

const missing = required.filter((name) => {
  const value = process.env[name];
  return value === undefined || value === null || String(value).trim() === "";
});

if (missing.length) {
  console.error(`Missing required env vars: ${missing.join(", ")}`);
  process.exit(1);
}

console.log(`All required env vars present (${required.length})`);
