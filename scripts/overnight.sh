#!/usr/bin/env bash
# Run manually before bed:  bash scripts/overnight.sh
# Or schedule with cron:    17 3 * * * cd /path/to/wrenchnow && bash scripts/overnight.sh
cd "$(dirname "$0")/.."
git checkout main && git pull
claude -p "$(cat docs/nightly/NIGHTLY_PROMPT.md)" --max-turns 150 \
  > "docs/nightly/run-$(date +%F).log" 2>&1
