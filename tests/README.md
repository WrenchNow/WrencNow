# Pantry Pal tests

Regression tests for the built app (`pantry-pal.html`) and the real Worker (`pantry-pal-worker/src/index.js`).
Nothing to install: they use Node 22+ and the Playwright + Chromium already on the dev machine.

    python3 build.py              # tests run against the built file, so rebuild first
    node tests/run-all.mjs        # every suite; one line each, then PASS/FAIL (exit code 1 on any failure)
    node tests/run-all.mjs paste  # only suites whose file name contains "paste"
    node tests/paste-test.mjs     # one suite, full output

All browser tests run at 390px wide with the network blocked (Google Fonts fail on purpose), and mock any
backend, Open Food Facts or library download they need. Nothing real is called.

| Setting (env var) | Default |
|---|---|
| `PLAYWRIGHT_MODULES` folder that contains `playwright/` | `/opt/node22/lib/node_modules/`, then a normal `require('playwright')` |
| `CHROMIUM_PATH` | `/opt/pw-browsers/chromium` if it exists, else Playwright's own browser |
| `TEST_OUT` where logs and screenshots go | `<system temp>/pantry-pal-tests` (never inside the repo) |

Notes
- `upgrade-test` reads an old build from git (`git show 9c1ea6e:pantry-pal.html`), so it needs full git history.
- `shots` also checks the static site when `site/` has been built (`node build-site.js https://example.com`), and skips that part otherwise.
- `fixtures/order-samples.mjs` is hand-written, synthetic text. No real orders.
- `scripts/make-icons.mjs` (not a test) re-renders `src/apple-touch-icon.png` from `src/icon.svg` with the same Playwright setup.
