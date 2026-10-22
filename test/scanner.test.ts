import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
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
  const result = scanTarget({ cwd, target: 'fixtures/safe/.github/workflows', ignoreRules: [] });
  assert.equal(result.findings.length, 0);
  assert.equal(shouldFail(result.findings, 'high'), false);
});

test('scanner detects missing dependency path on setup cache', () => {
  const result = scanTarget({ cwd, target: 'fixtures/stale/.github/workflows', ignoreRules: [] });
  assert.ok(result.findings.some((finding) => finding.id === 'setup-cache-missing-dependency-path'));
});

test('scanner applies cache rules only to exact official action identities', () => {
  const result = scanTarget({ cwd, target: 'fixtures/action-semantics/.github/workflows', ignoreRules: [] });

  assert.deepEqual(
    result.findings.map(({ id, message }) => ({ id, message })),
    [
      {
        id: 'dangerous-cache-path',
        message: 'Cache path `.env` may include secrets or machine-specific credentials.'
      }
    ]
  );
});

function writeCacheWorkflow(projectRoot: string): string {
  const workflows = path.join(projectRoot, '.github', 'workflows');
  mkdirSync(workflows, { recursive: true });
  writeFileSync(path.join(workflows, 'ci.yml'), `jobs:
  test:
    steps:
      - uses: actions/cache@v4
        with:
          path: ~/.npm
          key: \${{ runner.os }}-npm
`);
  return workflows;
}

test('scanner scopes lockfiles to a nested workflow project', (t) => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'cachekey-scanner-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(path.join(root, 'package-lock.json'), '{}');
  const project = path.join(root, 'examples', 'app');
  const workflows = writeCacheWorkflow(project);
  writeFileSync(path.join(project, 'pnpm-lock.yaml'), 'lockfileVersion: 9');

  const result = scanTarget({ cwd: root, target: path.relative(root, workflows), ignoreRules: [] });

  assert.deepEqual(result.detectedLockfiles, ['examples/app/pnpm-lock.yaml']);
  assert.ok(result.findings.some((finding) => finding.id === 'missing-lock-hash'));
});

test('scanner handles absolute external targets without borrowing cwd lockfiles', (t) => {
  const cwd = mkdtempSync(path.join(os.tmpdir(), 'cachekey-cwd-'));
  const external = mkdtempSync(path.join(os.tmpdir(), 'cachekey-external-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  t.after(() => rmSync(external, { recursive: true, force: true }));
  writeFileSync(path.join(cwd, 'package-lock.json'), '{}');
  const workflows = writeCacheWorkflow(external);

  const withoutRelevantLockfile = scanTarget({ cwd, target: workflows, ignoreRules: [] });
  assert.deepEqual(withoutRelevantLockfile.detectedLockfiles, []);
  assert.ok(!withoutRelevantLockfile.findings.some((finding) => finding.id === 'missing-lock-hash'));

  writeFileSync(path.join(external, 'yarn.lock'), '');
  const withRelevantLockfile = scanTarget({ cwd, target: workflows, ignoreRules: [] });
  assert.deepEqual(withRelevantLockfile.detectedLockfiles, [path.posix.join('..', path.basename(external), 'yarn.lock')]);
  assert.ok(withRelevantLockfile.findings.some((finding) => finding.id === 'missing-lock-hash'));
});
