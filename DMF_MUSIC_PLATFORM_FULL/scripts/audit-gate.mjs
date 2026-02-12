import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const severityRank = {
  info: 0,
  low: 1,
  moderate: 2,
  high: 3,
  critical: 4,
};

function loadPolicy(policyPath) {
  return JSON.parse(readFileSync(policyPath, "utf8"));
}

function runAudit(projectPath) {
  const args = ["audit", "--prefix", projectPath, "--audit-level=high", "--json"];
  const result = spawnSync("npm", args, {
    encoding: "utf8",
    shell: process.platform === "win32",
  });

  const output = result.stdout?.trim() || result.stderr?.trim();
  if (!output) {
    throw new Error(`npm audit produced no JSON for ${projectPath}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(output);
  } catch (err) {
    throw new Error(`failed to parse npm audit output for ${projectPath}: ${err.message}`);
  }

  return parsed;
}

function isExpired(expiresOn) {
  if (!expiresOn) return false;
  const cutoff = new Date(`${expiresOn}T23:59:59.999Z`);
  return Number.isFinite(cutoff.getTime()) && cutoff.getTime() < Date.now();
}

function isAllowed(projectRules, vulnName, vulnSeverity) {
  for (const rule of projectRules) {
    if (rule.package !== vulnName) continue;
    if (isExpired(rule.expiresOn)) continue;
    const max = severityRank[rule.maxSeverity ?? "critical"];
    const actual = severityRank[vulnSeverity] ?? -1;
    if (actual <= max) return true;
  }
  return false;
}

function evaluateProject(projectPath, projectRules) {
  const report = runAudit(projectPath);
  const vulnerabilities = report.vulnerabilities ?? {};
  const failing = [];
  const allowed = [];

  for (const vuln of Object.values(vulnerabilities)) {
    const severity = vuln.severity ?? "info";
    if ((severityRank[severity] ?? -1) < severityRank.high) continue;

    if (isAllowed(projectRules, vuln.name, severity)) {
      allowed.push(`${vuln.name} (${severity})`);
      continue;
    }
    failing.push(`${vuln.name} (${severity})`);
  }

  return { failing, allowed };
}

function main() {
  const policyPath = process.env.AUDIT_ALLOWLIST_PATH ?? "security/audit-allowlist.json";
  const policy = loadPolicy(policyPath);
  const projects = policy.projects ?? {};

  if (!Object.keys(projects).length) {
    throw new Error(`no projects found in ${policyPath}`);
  }

  let failed = false;
  for (const [projectPath, projectRules] of Object.entries(projects)) {
    const { failing, allowed } = evaluateProject(projectPath, projectRules);
    if (allowed.length) {
      console.log(`[audit] ${projectPath} allowlisted: ${allowed.join(", ")}`);
    }
    if (failing.length) {
      failed = true;
      console.error(`[audit] ${projectPath} unallowlisted high/critical: ${failing.join(", ")}`);
    } else {
      console.log(`[audit] ${projectPath} OK`);
    }
  }

  if (failed) {
    console.error("AUDIT GATE FAIL");
    process.exit(1);
  }
  console.log("AUDIT GATE OK");
}

main();
