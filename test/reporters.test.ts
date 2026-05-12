import test from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown } from '../src/reporters/markdown.ts';
import { renderJson } from '../src/reporters/json.ts';
import type { ScanResult } from '../src/types.ts';

const sample: ScanResult = {
  target: '.github/workflows',
  scannedFiles: ['.github/workflows/ci.yml'],
  detectedLockfiles: ['package-lock.json'],
  findings: [
    {
      id: 'missing-lock-hash',
      severity: 'high',
      title: 'Cache key misses lockfile hash',
      message: 'Key misses hashFiles()',
      remediation: 'Add hashFiles()',
      file: '.github/workflows/ci.yml',
      line: 12,
      snippet: 'key: node-modules'
    }
  ]
};

test('markdown reporter includes findings', () => {
  const output = renderMarkdown(sample);
  assert.match(output, /CacheKey Report/);
  assert.match(output, /missing-lock-hash/);
});

test('json reporter serializes result', () => {
  const output = renderJson(sample);
  const parsed = JSON.parse(output) as ScanResult;
  assert.equal(parsed.findings[0]?.id, 'missing-lock-hash');
});
