import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { scanTarget, shouldFail } from '../src/core/scanner.ts';

const cwd = path.resolve(import.meta.dirname, '..');

test('scanner finds risky cache issues', () => {
  const result = scanTarget({ cwd, target: 'fixtures/risky/.github/workflows', ignoreRules: [] });
  assert.equal(result.scannedFiles.length, 1);
  assert.ok(result.findings.some((finding) => finding.id === 'missing-lock-hash'));
  assert.ok(result.findings.some((finding) => finding.id === 'dangerous-cache-path'));
  assert.ok(result.findings.some((finding) => finding.id === 'mutable-build-output'));
  assert.equal(shouldFail(result.findings, 'medium'), true);
});

test('scanner accepts safe workflow', () => {
  const result = scanTarget({ cwd, target: 'fixtures/safe/.github/workflows', ignoreRules: ['broad-restore-key'] });
  assert.equal(result.findings.length, 0);
  assert.equal(shouldFail(result.findings, 'high'), false);
});

test('scanner detects missing dependency path on setup cache', () => {
  const result = scanTarget({ cwd, target: 'fixtures/stale/.github/workflows', ignoreRules: [] });
  assert.ok(result.findings.some((finding) => finding.id === 'setup-cache-missing-dependency-path'));
});
