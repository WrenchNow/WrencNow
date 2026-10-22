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
| `TEST_LIBS` optional real barcode/OCR libraries (see notes) | unset: those checks are skipped |

Notes
- `upgrade-test` reads an old build from git (`git show 9c1ea6e:pantry-pal.html`), so it needs full git history.
- `shots` also checks the static site when `site/` has been built (`node build-site.js https://example.com`), and skips that part otherwise.
- `fixtures/order-samples.mjs` and `fixtures/receipt-ocr-samples.mjs` are hand-written, synthetic text. No real orders or receipts.
- `barcode-test` and `receipt-ocr-test` mock Open Food Facts and the barcode/OCR libraries. Set `TEST_LIBS` to a folder with the unpacked npm packages (`bd/package` = barcode-detector@3.2.2, `zx/package` = zxing-wasm@3.1.3, `ts/package` = tesseract.js@7.0.0, `core/package` = tesseract.js-core@7.0.0, `eng/package` = @tesseract.js-data/eng@1.0.0) to also run the real libraries from local files: SRI and wasm hash checks, a real EAN-13 decode and a real OCR read. Keep that folder outside the repo (for example `npm pack <pkg>@<version>` in a temp folder, then untar each into its own subfolder). Without it, those parts print `skip`.
- `scripts/make-icons.mjs` (not a test) re-renders `src/apple-touch-icon.png` from `src/icon.svg` with the same Playwright setup.
