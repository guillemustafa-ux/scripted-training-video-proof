import { chromium } from "playwright";
import { mkdirSync, copyFileSync, writeFileSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { validateScript, selectorFor } from "./script.mjs";

const DEFAULT_HOLD = 2600;
const VIEWPORT = { width: 1280, height: 720 };

export class ScriptError extends Error {}

export async function runScript(script, { baseDir, outDir, record = true, stepTimeoutMs = 3000 }) {
  const errors = validateScript(script);
  if (errors.length) throw new ScriptError(`invalid script:\n  ${errors.join("\n  ")}`);

  const url = /^https?:/.test(script.url) ? script.url : pathToFileURL(resolve(baseDir, script.url)).href;
  const rawDir = join(outDir, "raw");
  if (record) {
    rmSync(rawDir, { recursive: true, force: true });
    mkdirSync(rawDir, { recursive: true });
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: VIEWPORT,
    ...(record ? { recordVideo: { dir: rawDir, size: VIEWPORT } } : {}),
  });
  const page = await context.newPage();
  const t0 = Date.now();
  const timeline = [];
  try {
    await page.goto(url);
    for (const [i, step] of script.steps.entries()) {
      let box = null;
      if (step.target) {
        const loc = page.locator(selectorFor(step.target));
        try {
          await loc.waitFor({ state: "visible", timeout: stepTimeoutMs });
        } catch {
          throw new ScriptError(`steps[${i}] (${step.action}): target "${step.target}" not found on the page`);
        }
        box = await loc.boundingBox();
      }
      const start = Date.now() - t0;
      if (step.action === "click") await page.locator(selectorFor(step.target)).click();
      if (step.action === "fill") await page.locator(selectorFor(step.target)).fill(step.value);
      if (step.action === "select") await page.locator(selectorFor(step.target)).selectOption(step.value);
      if (record) await page.waitForTimeout(step.holdMs ?? DEFAULT_HOLD);
      timeline.push({ index: i, action: step.action, text: step.text, box, startMs: start, endMs: Date.now() - t0 });
    }
  } finally {
    await context.close();
    await browser.close();
  }

  if (!record) return { timeline };
  const video = await page.video().path();
  mkdirSync(outDir, { recursive: true });
  copyFileSync(video, join(outDir, "recording.webm"));
  const props = { title: script.title, viewport: VIEWPORT, totalMs: timeline.at(-1).endMs + 400, timeline };
  writeFileSync(join(outDir, "timeline.json"), JSON.stringify(props, null, 2));
  return props;
}
