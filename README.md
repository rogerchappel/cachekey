# cachekey

CacheKey is a local-first CLI that audits GitHub Actions cache usage before weak keys, stale restores, or risky paths leak into CI.

## Why it exists

CI cache mistakes are easy to miss:

- keys skip lockfile hashes, so dependency changes never invalidate
- restore keys are too broad, so stale blobs jump across branches
- secret-ish files or build artifacts get cached accidentally
- setup-node cache config looks correct but misses dependency-path details

CacheKey scans workflow YAML and nearby lockfiles entirely offline, then emits actionable Markdown or JSON.

## Install

```bash
npm install
npm run build
npm link
```

Or run without linking:

```bash
node dist/cli.js scan .github/workflows
```

## Quick start

```bash
cachekey scan .github/workflows --out cache-report.md
cachekey scan fixtures/risky/.github/workflows --format json --fail-on medium
cachekey rules
```

## What it checks in v0.1

- missing `hashFiles(...)` in explicit `actions/cache` keys when lockfiles exist
- overly broad `restore-keys`
- dangerous cache paths like `.env`, `.npmrc`, `.ssh`, `secrets`
- mutable build output caches like `dist/`, `build/`, `coverage/`
- `actions/setup-node` cache usage missing `cache-dependency-path`

## Output

### Markdown

Designed for humans and pull request artifacts.

### JSON

Designed for scripts and CI gates.

Each finding includes:

- severity
- rule id
- title
- file + line
- snippet
- remediation

## Config

Create `.cachekeyrc.json` in the repo root:

```json
{
  "ignoreRules": ["broad-restore-key"],
  "lockfilePatterns": ["package-lock.json", "pnpm-lock.yaml"],
  "ignorePaths": ["vendor/examples"]
}
```

Ad hoc ignores are also supported:

```bash
cachekey scan .github/workflows --ignore-rule broad-restore-key
```

## Safety model

CacheKey is read-only in v0.1.

- no workflow rewrites
- no network calls
- no GitHub API usage
- no cache mutation

It only reads local files and writes reports where you ask it to.

## Limitations

- V1 is GitHub Actions focused
- heuristic rule matching means false positives are possible
- YAML line detection is best-effort, not AST-perfect
- setup-* cache coverage is intentionally narrow in this first release

## Real fixture smoke

```bash
npm run build
node dist/cli.js scan fixtures/risky/.github/workflows --out tmp/risky-report.md
node dist/cli.js scan fixtures/safe/.github/workflows --format json --out tmp/safe-report.json
```

For a repeatable walkthrough that creates both reports and verifies them:

```bash
bash demo/run-workflow-cache-demo.sh
```

The demo writes reports under `tmp/workflow-cache-demo/`. A short video outline
and social hooks live in
[`docs/promo/workflow-cache-demo-brief.md`](docs/promo/workflow-cache-demo-brief.md).

## CI usage

```bash
npm run build
node dist/cli.js scan .github/workflows --fail-on medium
```

## Development

```bash
npm test
npm run check
npm run build
npm run smoke
bash scripts/validate.sh
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Security

See [SECURITY.md](SECURITY.md).

## License

MIT
