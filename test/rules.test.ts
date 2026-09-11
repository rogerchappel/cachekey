import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { evaluateRules } from '../src/core/rules.ts';
import { loadWorkflowDocuments } from '../src/core/workflow-parser.ts';
import type { ScanConfig } from '../src/types.ts';

const cwd = path.resolve(import.meta.dirname, '..');
const config: ScanConfig = { ignoreRules: [], lockfilePatterns: [], ignorePaths: [] };
const lockfiles = ['fixtures/sequence-values/package-lock.json'];

test('rules evaluate sequence and block-scalar inputs identically', () => {
  const documents = loadWorkflowDocuments(cwd, 'fixtures/sequence-values/.github/workflows', []);
  assert.deepEqual(documents.map((workflow) => path.basename(workflow.file)).sort(), ['block-scalar.yml', 'sequence.yml']);

  const perShape = documents.map((workflow) =>
    workflow.steps.flatMap((step) =>
      evaluateRules({ workflow, step, config, lockfiles }).map(({ id, severity, message, remediation }) => ({
        id,
        severity,
        message,
        remediation
      }))
    )
  );
  const [first, second] = perShape;

  assert.deepEqual(second, first, 'a list-shaped with: map must trigger the same rule findings as a block scalar');
  assert.deepEqual(
    first.map((finding) => finding.id).sort(),
    ['broad-restore-key', 'dangerous-cache-path', 'mutable-build-output']
  );
});
