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
