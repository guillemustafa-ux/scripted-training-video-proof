#!/usr/bin/env node
import { readFileSync, mkdirSync, copyFileSync } from "node:fs";
import { resolve, dirname, basename, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { runScript, ScriptError } from "../lib/record.mjs";

const args = process.argv.slice(2);
const check = args.includes("--check");
const file = args.find((a) => !a.startsWith("--"));
if (!file) {
  console.error("usage: make-video <script.json> [--check]");
  process.exit(2);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const scriptPath = resolve(file);
const name = basename(scriptPath, ".json");
const outDir = join(root, "out", name);

try {
  const script = JSON.parse(readFileSync(scriptPath, "utf8"));
  if (check) {
    const { timeline } = await runScript(script, { baseDir: root, outDir, record: false });
    console.log(`OK ${name}: ${timeline.length} steps ran against the app, every target found`);
    process.exit(0);
  }
  await runScript(script, { baseDir: root, outDir });
  mkdirSync(join(root, "public"), { recursive: true });
  copyFileSync(join(outDir, "recording.webm"), join(root, "public", "recording.webm"));
  const mp4 = join(root, "out", `${name}.mp4`);
  const r = spawnSync("npx", ["remotion", "render", "remotion/index.jsx", "Training", mp4, `--props=${join(outDir, "timeline.json")}`], {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
  console.log(`video: ${mp4}`);
} catch (e) {
  if (e instanceof ScriptError || e instanceof SyntaxError) {
    console.error(`FAIL ${name}: ${e.message}`);
    process.exit(1);
  }
  throw e;
}
