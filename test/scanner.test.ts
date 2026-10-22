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

test('scanner audits split restore and save cache actions', () => {
  const risky = scanTarget({ cwd, target: 'fixtures/split-risky/.github/workflows', ignoreRules: [] });
  assert.deepEqual(
    risky.findings.map(({ id, file, line }) => ({ id, file, line })),
    [
      {
        id: 'missing-lock-hash',
        file: 'fixtures/split-risky/.github/workflows/ci.yml',
        line: 7
      }
    ]
  );

  const safe = scanTarget({ cwd, target: 'fixtures/split-safe/.github/workflows', ignoreRules: [] });
  assert.deepEqual(safe.findings, []);
});

test('scanner skips ignored workflow paths before parsing', (t) => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'cachekey-ignore-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeCacheWorkflow(root);
  const ignored = path.join(root, 'vendor', 'examples');
  mkdirSync(ignored, { recursive: true });
  writeFileSync(path.join(ignored, 'bad.yml'), 'jobs: [');
  writeFileSync(path.join(root, '.cachekeyrc.json'), JSON.stringify({ ignorePaths: ['vendor/examples'] }));

  const result = scanTarget({ cwd: root, target: '.', ignoreRules: [] });

  assert.deepEqual(result.scannedFiles, ['.github/workflows/ci.yml']);
  assert.ok(result.findings.every((finding) => finding.file !== 'vendor/examples/bad.yml'));
  assert.equal(result.scannedFiles.includes('vendor/examples/bad.yml'), false);
});

test('scanner still rejects malformed YAML outside ignored path boundaries', (t) => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'cachekey-ignore-boundary-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(path.join(root, 'vendor', 'examples-copy'), { recursive: true });
  writeFileSync(path.join(root, 'vendor', 'examples-copy', 'bad.yml'), 'jobs: [');
  writeFileSync(path.join(root, '.cachekeyrc.json'), JSON.stringify({ ignorePaths: ['vendor/examples'] }));

  assert.throws(
    () => scanTarget({ cwd: root, target: '.', ignoreRules: [] }),
    /Invalid workflow YAML:\nvendor\/examples-copy\/bad\.yml:1:/
  );
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

test('scanner reports identical findings for sequence and block-scalar cache inputs', () => {
  const result = scanTarget({ cwd, target: 'fixtures/sequence-values/.github/workflows', ignoreRules: [] });
  assert.deepEqual(result.scannedFiles, [
    'fixtures/sequence-values/.github/workflows/block-scalar.yml',
    'fixtures/sequence-values/.github/workflows/sequence.yml'
  ]);

  const findingsByFile = new Map<string, Array<{ id: string; severity: string; message: string; line: number }>>();
  for (const file of result.scannedFiles) {
    findingsByFile.set(
      file,
      result.findings
        .filter((finding) => finding.file === file)
        .map(({ id, severity, message, line }) => ({ id, severity, message, line }))
        .sort((a, b) => a.id.localeCompare(b.id))
    );
  }
  const [blockScalar, sequence] = result.scannedFiles.map((file) => findingsByFile.get(file));

  assert.deepEqual(sequence?.map(({ id }) => id), ['broad-restore-key', 'dangerous-cache-path', 'mutable-build-output']);
  assert.deepEqual(sequence, blockScalar, 'sequence-shaped inputs must report exactly what the block-scalar form reports');
  assert.equal(result.findings.some((finding) => finding.id === 'missing-lock-hash'), false, 'both shapes keep the valid hashFiles key');
  assert.equal(result.findings.some((finding) => finding.message.includes('`.env`')), true);
});
