// Shared helpers for the Pantry Pal test suites. No npm install needed.
//   Playwright: loaded from PLAYWRIGHT_MODULES (a folder that contains playwright/), default the global
//   install at /opt/node22/lib/node_modules/, falling back to a normal require('playwright').
//   Chromium:   CHROMIUM_PATH, default /opt/pw-browsers/chromium when it exists, else Playwright's own.
//   Output:     screenshots and temp files go to TEST_OUT (default <os tmp>/pantry-pal-tests), never the repo.
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const APP_PATH = path.join(ROOT, 'pantry-pal.html');
export const APP = pathToFileURL(APP_PATH).href;
export const WORKER_SRC = path.join(ROOT, 'pantry-pal-worker', 'src', 'index.js');
export const OUT = process.env.TEST_OUT || path.join(os.tmpdir(), 'pantry-pal-tests');
fs.mkdirSync(OUT, { recursive: true });

function loadPlaywright() {
  const dir = process.env.PLAYWRIGHT_MODULES ?? '/opt/node22/lib/node_modules/';
  if (dir) { try { return createRequire(path.join(dir, 'noop.js'))('playwright'); } catch { } }
  return createRequire(import.meta.url)('playwright');
}
export const playwright = loadPlaywright();
export const chromium = playwright.chromium;
const DEFAULT_CHROMIUM = '/opt/pw-browsers/chromium';
export const launch = (opts = {}) => chromium.launch({ executablePath: process.env.CHROMIUM_PATH || (fs.existsSync(DEFAULT_CHROMIUM) ? DEFAULT_CHROMIUM : undefined), ...opts });
