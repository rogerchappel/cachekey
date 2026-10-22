import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadWorkflowDocuments } from '../src/core/workflow-parser.ts';

test('parser reports the source line for every repeated cache action', (t) => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'cachekey-parser-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const workflows = path.join(root, '.github', 'workflows');
  mkdirSync(workflows, { recursive: true });
  writeFileSync(path.join(workflows, 'ci.yml'), `name: CI
jobs:
  first:
    steps:
      - uses: actions/cache@v4
      - uses: actions/cache@v4
  second:
    steps:
      - name: setup
        uses: actions/setup-node@v4
        with:
          cache: npm
      - uses: actions/cache@v4
`);

  const [workflow] = loadWorkflowDocuments(root, workflows);

  assert.deepEqual(workflow.steps.map((step) => step.reference.line), [5, 6, 10, 13]);
});

test('parser recognizes official split cache actions with valid references only', (t) => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'cachekey-parser-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const workflows = path.join(root, '.github', 'workflows');
  mkdirSync(workflows, { recursive: true });
  writeFileSync(path.join(workflows, 'split.yml'), `jobs:
  test:
    steps:
      - uses: ACTIONS/CACHE/RESTORE@v4
      - uses: actions/cache/save@refs/heads/main
      - uses: actions/cache/restore@
      - uses: actions/cache/save
      - uses: actions/cache/save@v4 extra
`);

  const [workflow] = loadWorkflowDocuments(root, workflows);

  assert.deepEqual(
    workflow.steps.map((step) => ({ kind: step.kind, uses: step.uses, line: step.reference.line })),
    [
      { kind: 'actions-cache', uses: 'ACTIONS/CACHE/RESTORE@v4', line: 4 },
      { kind: 'actions-cache', uses: 'actions/cache/save@refs/heads/main', line: 5 }
    ]
  );
});

test('parser rejects malformed YAML with its workflow path and location', (t) => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'cachekey-parser-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const workflows = path.join(root, '.github', 'workflows');
  mkdirSync(workflows, { recursive: true });
  writeFileSync(path.join(workflows, 'broken.yml'), 'jobs:\n  test:\n    steps: [');

  assert.throws(
    () => loadWorkflowDocuments(root, workflows),
    /Invalid workflow YAML:\n\.github\/workflows\/broken\.yml:3:\d+: Flow sequence in block collection must be sufficiently indented/
  );
});

test('parser keeps sequence-valued with: inputs as newline-joined strings', (t) => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'cachekey-parser-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const workflows = path.join(root, '.github', 'workflows');
  mkdirSync(workflows, { recursive: true });
  writeFileSync(path.join(workflows, 'sequence.yml'), `jobs:
  build:
    steps:
      - uses: actions/cache@v4
        with:
          path:
            - ~/.npm
            - .env
          key:
            - ${{ runner.os }}-node
            - ${{ hashFiles('**/package-lock.json') }}
          restore-keys:
            - ${{ runner.os }}-
`);

  const [workflow] = loadWorkflowDocuments(root, workflows);
  const [step] = workflow.steps;

  assert.equal(step.kind, 'actions-cache');
  assert.equal(step.with.path, '~/.npm\n.env');
  assert.equal(step.with['restore-keys'], '${{ runner.os }}-');
  assert.equal(step.with.key, "${{ runner.os }}-node\n${{ hashFiles('**/package-lock.json') }}");
});

test('parser applies the same string-only normalization inside sequences', (t) => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'cachekey-parser-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const workflows = path.join(root, '.github', 'workflows');
  mkdirSync(workflows, { recursive: true });
  writeFileSync(path.join(workflows, 'mixed.yml'), `jobs:
  build:
    steps:
      - uses: actions/cache@v4
        with:
          path:
            - dist
            - 42
            - nested:
                - value
          restore-keys: []
          key: true
      - uses: actions/setup-node@v4
        with:
          cache:
            - npm
`);

  const [workflow] = loadWorkflowDocuments(root, workflows);
  const [cacheStep, setupStep] = workflow.steps;

  assert.equal(cacheStep.with.path, 'dist', 'non-string sequence entries are dropped');
  assert.equal('restore-keys' in cacheStep.with, false, 'an empty sequence provides no value');
  assert.equal('key' in cacheStep.with, false, 'non-string scalars stay excluded as before');
  assert.equal(setupStep.kind, 'setup-cache', 'a one-entry sequence still marks the step as cached');
  assert.equal(setupStep.with.cache, 'npm');
});
