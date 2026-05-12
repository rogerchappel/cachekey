# cachekey TASKS

## Build contract

Ship a genuinely usable local-first TypeScript CLI for `cachekey` matching `docs/PRD.md`.

## Atomic waves

1. Baseline repo setup
   - Initialize git on `main` if needed.
   - Add TypeScript, test runner config, bin entry, fixtures, and validation scripts.
   - Keep commits small and meaningful.
2. Core domain model
   - Define finding/result/config types.
   - Implement deterministic filesystem discovery with safe path boundaries.
   - Preserve file/line evidence where applicable.
3. Parsers and analyzers
   - Implement the V1 parsers promised in the PRD.
   - Add rule IDs, severities, remediations, and stable ordering.
4. CLI and reporters
   - Add scan/rules/explain commands as applicable.
   - Support Markdown and JSON output, `--out`, `--format`, `--fail-on`, config/ignore flags.
5. Fixtures and tests
   - Add good/warning/failing fixtures.
   - Add unit and integration tests for parser/rule/report behavior.
6. Smokes and docs
   - Add `npm run check`, `npm run build`, `npm run smoke`, and `scripts/validate.sh` coverage.
   - Rewrite README with concise personality, practical examples, safety defaults, limitations, and CI usage.
   - Ensure SECURITY, CONTRIBUTING, package metadata, topics/description are useful.
7. Publish
   - Create public GitHub repo `rogerchappel/cachekey` if absent.
   - Push directly to `main` as Roger/admin.
   - Protect `main` best-effort using `/Users/roger/.openclaw/workspace/scripts/protect-github-main.sh rogerchappel cachekey main`.

## Verification checklist

- `npm test`
- `npm run check`
- `npm run build`
- `npm run smoke`
- `bash scripts/validate.sh`
- At least one real CLI smoke against checked-in fixtures
- `git log --oneline | wc -l` near 30-50 meaningful commits
