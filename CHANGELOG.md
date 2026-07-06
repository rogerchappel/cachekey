# Changelog

## Unreleased

- CLI version output now follows package metadata instead of a hard-coded
  literal.
- Smoke and package verification execute the built CLI version path.

## 0.1.0

- initial CacheKey MVP release
- GitHub Actions cache scanner with Markdown and JSON reports
- built-in fixtures, tests, smoke script, and validation script
- package smoke now verifies the CLI bin target, docs, example config, package
  metadata, and npm files allowlist before the dry-run pack
