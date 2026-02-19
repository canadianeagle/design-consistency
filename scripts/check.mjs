import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = new URL("../", import.meta.url).pathname;
const TARGET_DIRS = ["src", "scripts"];

function walk(dir, output = []) {
  const entries = readdirSync(dir);
  entries.forEach((entry) => {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full, output);
      return;
    }
    if (extname(full) === ".js" || extname(full) === ".mjs") {
      output.push(full);
    }
  });
  return output;
}

function checkSyntax(filePath) {
  execFileSync("node", ["--check", filePath], { stdio: "pipe" });
}

function validateManifest() {
  const manifestPath = join(ROOT, "manifest.json");
  const parsed = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (parsed.manifest_version !== 3) {
    throw new Error("manifest_version must be 3.");
  }
  if (!parsed.action || !parsed.action.default_popup) {
    throw new Error("manifest action.default_popup is required.");
  }
}

function validateOptionsIds() {
  const html = readFileSync(join(ROOT, "src/options/options.html"), "utf8");
  const js = readFileSync(join(ROOT, "src/options/options.js"), "utf8");

  const idsInHtml = [...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
  const idsInJs = [...js.matchAll(/id:\s*"([^"]+)"/g)].map((m) => m[1]);
  const missing = idsInJs.filter((id) => !idsInHtml.includes(id));

  if (missing.length > 0) {
    throw new Error(`options ids missing in HTML: ${missing.join(", ")}`);
  }
}

function main() {
  validateManifest();
  validateOptionsIds();

  const files = TARGET_DIRS.flatMap((dir) => walk(join(ROOT, dir)));
  files.forEach((filePath) => checkSyntax(filePath));

  process.stdout.write(`Checked ${files.length} JS files + manifest/options wiring.\n`);
}

main();
