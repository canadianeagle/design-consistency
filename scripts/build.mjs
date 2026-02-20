import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("../", import.meta.url).pathname;
const DIST_DIR = join(ROOT, "dist");
const BUILD_DIR = join(DIST_DIR, "ui-consistency-investigator");

function clean() {
  if (existsSync(BUILD_DIR)) {
    rmSync(BUILD_DIR, { recursive: true, force: true });
  }
  mkdirSync(BUILD_DIR, { recursive: true });
}

function copyProjectFiles() {
  cpSync(join(ROOT, "manifest.json"), join(BUILD_DIR, "manifest.json"));
  cpSync(join(ROOT, "src"), join(BUILD_DIR, "src"), { recursive: true });
  cpSync(join(ROOT, "assets"), join(BUILD_DIR, "assets"), { recursive: true });
  cpSync(join(ROOT, "README.md"), join(BUILD_DIR, "README.md"));
}

function writeBuildInfo() {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  const info = {
    name: pkg.name,
    version: pkg.version,
    builtAt: new Date().toISOString()
  };
  writeFileSync(join(BUILD_DIR, "build-info.json"), JSON.stringify(info, null, 2));
}

function main() {
  clean();
  copyProjectFiles();
  writeBuildInfo();
  process.stdout.write(`Build output: ${BUILD_DIR}\n`);
}

main();
