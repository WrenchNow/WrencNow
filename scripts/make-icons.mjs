#!/usr/bin/env node
// Renders src/icon.svg as a full-bleed (square, opaque) 180x180 PNG for apple-touch-icon. iOS rounds the corners itself.
//   node scripts/make-icons.mjs                 writes src/apple-touch-icon.png
//   node scripts/make-icons.mjs out.png         writes somewhere else
// Then run  python3 build.py  so the new icon is inlined into pantry-pal.html.
// Uses the same Playwright/Chromium lookup as the tests (PLAYWRIGHT_MODULES, CHROMIUM_PATH); see tests/README.md.
import fs from 'node:fs';
import path from 'node:path';
import { launch, ROOT } from '../tests/lib.mjs';

const out = path.resolve(process.argv[2] || path.join(ROOT, 'src', 'apple-touch-icon.png'));
const svg = fs.readFileSync(path.join(ROOT, 'src', 'icon.svg'), 'utf8').replace(/<rect([^>]*) rx="\d+"/, '<rect$1');
const b = await launch();
const p = await b.newPage({ viewport: { width: 180, height: 180 }, deviceScaleFactor: 1 });
await p.setContent(`<style>html,body{margin:0}</style><img src="data:image/svg+xml,${encodeURIComponent(svg)}" width="180" height="180" style="display:block">`);
await p.screenshot({ path: out });
await b.close();
console.log('Wrote ' + out);
