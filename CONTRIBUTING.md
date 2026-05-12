# Contributing to cachekey

Thanks for helping. The project is intentionally small and local-first.

## Setup

```bash
npm install
npm run build
```

## Before opening a PR

```bash
npm test
npm run check
npm run build
npm run smoke
bash scripts/validate.sh
```

## Guidelines

- Keep changes small and reviewable.
- Add or update fixtures when a rule changes.
- Prefer deterministic tests over snapshot sprawl.
- Preserve offline, read-only behavior in the scanner.
- Document new rules in the README.
