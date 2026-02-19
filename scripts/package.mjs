import { execFileSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("../", import.meta.url).pathname;
const DIST_DIR = join(ROOT, "dist");
const BUILD_DIR = join(DIST_DIR, "ui-consistency-investigator");
const ZIP_PATH = join(DIST_DIR, "ui-consistency-investigator.zip");

function runBuild() {
  execFileSync("node", [join(ROOT, "scripts/build.mjs")], { stdio: "inherit" });
}

function zipBuild() {
  if (existsSync(ZIP_PATH)) {
    rmSync(ZIP_PATH, { force: true });
  }

  execFileSync("zip", ["-rq", ZIP_PATH, "."], {
    cwd: BUILD_DIR,
    stdio: "inherit"
  });
}

function main() {
  runBuild();
  zipBuild();
  process.stdout.write(`Packaged extension: ${ZIP_PATH}\n`);
}

main();
