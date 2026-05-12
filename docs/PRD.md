# CacheKey PRD

Status: in-progress

## Summary

A local CI cache auditor that spots broad, stale, or unsafe cache keys before they turn builds into haunted houses. 🗝️

## Source attribution

Created during the twice-daily OSS factory run on 2026-05-11 after the current idea pool had fewer than five unbuilt fast builds. Inspired by common GitHub Actions and CI cache failure modes: keys missing lockfile hashes, overbroad restore keys, cached secrets/artifacts, and cross-branch cache confusion. This is a renamed/reframed local checker, not a copy of a specific project.

## Target users

- OSS maintainers using CI dependency caches.
- Agents editing GitHub Actions workflows.
- Developers debugging flaky or slow builds.

## Problem

CI caches are invisible until they break something. A cache key may ignore lockfiles, share mutable build output across branches, or restore stale dependencies. Most teams only discover this through flakes or supply-chain scares.

## Goals

- Scan CI workflow files and common lockfiles offline.
- Detect risky cache paths, weak keys, missing lockfile hashes, broad restore keys, and cache poisoning-prone patterns.
- Produce actionable Markdown/JSON reports.
- Include fixtures for good, stale, and risky cache setups.
- Work without GitHub API access or network calls.

## Non-goals

- Modifying CI files automatically in V1.
- Measuring hosted cache hit rates.
- Supporting every CI provider deeply in V1.
- Replacing full supply-chain security platforms.

## V1 CLI

```bash
cachekey scan .github/workflows --out cache-report.md
cachekey scan fixtures/risky --format json --fail-on medium
cachekey rules
```

## Functional requirements

1. Parse GitHub Actions workflow YAML for `actions/cache`, setup-* cache options, and cache-like commands.
2. Inspect nearby lockfiles (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `poetry.lock`, `Cargo.lock`, `go.sum`) for recommended key material.
3. Flag weak keys, missing lock hashes, dangerous cache paths, broad restore keys, branch/event mismatch hazards, and mutable dependency caches.
4. Emit stable Markdown and JSON with severity, rule id, file, line, snippet, and remediation.
5. Support `--fail-on`, config ignores, custom lockfile patterns, and `--ignore-rule`.
6. Include fixtures and tests for safe, warning, and failing workflows.

## Acceptance criteria

- `npm test`, `npm run check`, `npm run build`, and `npm run smoke` pass.
- `bash scripts/validate.sh` passes when present.
- Real CLI smoke scans checked-in fixtures and writes reports.
- README covers quick start, rules, examples, safety model, limitations, and CI usage.
- Public GitHub repo `rogerchappel/cachekey` has useful description and topics.

## Suggested implementation waves

1. Scaffold TypeScript CLI with StackForge and planning docs.
2. Implement workflow parser and lockfile discovery.
3. Implement cache rules, reporters, config, and CLI flags.
4. Add fixtures, tests, smoke scripts, validation.
5. Polish README, package metadata, GitHub metadata, and branch protection.
