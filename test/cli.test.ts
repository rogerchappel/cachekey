import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdtempSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { run } from '../src/cli/run.ts';

const cwd = path.resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);
const pkg = require('../package.json') as { version: string };

test('rules command lists rules', () => {
  const result = run(['rules'], cwd);
  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /missing-lock-hash/);
});

test('version command follows package metadata', () => {
  const result = run(['version'], cwd);
  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout.trim(), pkg.version);
});

test('scan writes report to disk', () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), 'cachekey-'));
  const outFile = path.join(tempDir, 'report.md');
  const result = run(['scan', 'fixtures/risky/.github/workflows', '--out', outFile], cwd);
  assert.equal(result.exitCode, 0);
  assert.match(readFileSync(outFile, 'utf8'), /CacheKey Report/);
});

test('scan exits non-zero on fail-on threshold', () => {
  const result = run(['scan', 'fixtures/risky/.github/workflows', '--fail-on', 'medium'], cwd);
  assert.equal(result.exitCode, 1);
});
