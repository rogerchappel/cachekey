# Changelog

## Unreleased

- Refresh the `tsx` development dependency to resolve its patched `esbuild`
  release outside the affected advisory range.
- Scope lockfile evidence to the project containing the scanned workflows and
  report exact source lines for repeated cache actions.
- Match cache rules to exact official action identities and distinguish
  `actions/setup-node` dependency manifests from cached payload paths.
- CLI version output now follows package metadata instead of a hard-coded
  literal.
- Smoke and package verification execute the built CLI version path.

## 0.1.0

- initial CacheKey MVP release
- GitHub Actions cache scanner with Markdown and JSON reports
- built-in fixtures, tests, smoke script, and validation script
- package smoke now verifies the CLI bin target, docs, example config, package
  metadata, and npm files allowlist before the dry-run pack
