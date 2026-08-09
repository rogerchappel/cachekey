#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
out_dir="$repo_root/tmp/workflow-cache-demo"

cd "$repo_root"
rm -rf "$out_dir"
mkdir -p "$out_dir"

npm run build

node dist/cli.js scan fixtures/risky/.github/workflows --out "$out_dir/risky.md"
node dist/cli.js scan fixtures/safe/.github/workflows --format json --out "$out_dir/safe.json"

grep -q 'CacheKey Report' "$out_dir/risky.md"
node -e 'const report = require(process.argv[1]); if (!Array.isArray(report.findings) || report.findings.length !== 0) process.exit(1)' "$out_dir/safe.json"

printf 'Risky workflow report: %s\n' "$out_dir/risky.md"
printf 'Safe workflow JSON: %s\n' "$out_dir/safe.json"
