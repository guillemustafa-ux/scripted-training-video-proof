import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { validateScript } from "../lib/script.mjs";

const root = resolve(import.meta.dirname, "..");
const good = JSON.parse(readFileSync(join(root, "scripts/unusual-options-scan.json"), "utf8"));
const clone = () => structuredClone(good);

test("the shipped script is valid", () => {
  assert.deepEqual(validateScript(good), []);
});

test("unknown action is rejected with its step index", () => {
  const s = clone();
  s.steps[2].action = "doubleclick";
  assert.deepEqual(validateScript(s), ['steps[2]: unknown action "doubleclick"']);
});

test("click without target is rejected", () => {
  const s = clone();
  delete s.steps[4].target;
  assert.deepEqual(validateScript(s), ["steps[4]: target is required for click"]);
});

test("fill without value is rejected", () => {
  const s = clone();
  delete s.steps[2].value;
  assert.deepEqual(validateScript(s), ["steps[2]: value is required for fill"]);
});

test("every step needs narration text", () => {
  const s = clone();
  s.steps[0].text = "  ";
  assert.deepEqual(validateScript(s), ["steps[0]: text (narration) is required"]);
});

test("holdMs out of range is rejected", () => {
  const s = clone();
  s.steps[1].holdMs = 60000;
  assert.deepEqual(validateScript(s), ["steps[1]: holdMs must be an integer between 500 and 15000"]);
});

test("empty steps are rejected", () => {
  assert.deepEqual(validateScript({ title: "t", url: "u", steps: [] }), ["steps must be a non-empty array"]);
});

function check(script) {
  const dir = mkdtempSync(join(tmpdir(), "stv-"));
  const file = join(dir, "lesson.json");
  writeFileSync(file, JSON.stringify(script));
  try {
    return spawnSync(process.execPath, [join(root, "bin/make-video.mjs"), file, "--check"], { encoding: "utf8" });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("--check runs the shipped script against the app", () => {
  const r = check(good);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /OK lesson: 8 steps ran against the app, every target found/);
});

test("--check fails fast when a target does not exist, before any recording", () => {
  const s = clone();
  s.steps[4].target = "run-scann";
  const r = check(s);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /FAIL lesson: steps\[4\] \(click\): target "run-scann" not found on the page/);
});

test("--check fails when a step depends on a row the scan never produced", () => {
  const s = clone();
  s.steps[2].value = "9.0";
  const r = check(s);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /steps\[6\] \(click\): target "row-AAA" not found/);
});

test("--check reports an invalid script without opening a browser", () => {
  const s = clone();
  s.steps[0].action = "zoom";
  const r = check(s);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /invalid script:\n {2}steps\[0\]: unknown action "zoom"/);
});
