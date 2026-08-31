import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadConfig } from '../src/config/load-config.ts';
import { DEFAULT_CONFIG } from '../src/config/defaults.ts';

function withConfig(t: test.TestContext, value: string): string {
  const root = mkdtempSync(path.join(os.tmpdir(), 'cachekey-config-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(path.join(root, '.cachekeyrc.json'), value);
  return root;
}

test('config rejects malformed JSON with a stable diagnostic', (t) => {
  assert.throws(() => loadConfig(withConfig(t, '{')), {
    message: 'Invalid .cachekeyrc.json: malformed JSON.'
  });
});

for (const value of ['null', '[]', '"config"', '42']) {
  test(`config rejects non-object root ${value}`, (t) => {
    assert.throws(() => loadConfig(withConfig(t, value)), {
      message: 'Invalid .cachekeyrc.json: expected an object.'
    });
  });
}

for (const field of ['ignoreRules', 'lockfilePatterns', 'ignorePaths']) {
  test(`config rejects a non-array ${field}`, (t) => {
    const root = withConfig(t, JSON.stringify({ [field]: 'value' }));
    assert.throws(() => loadConfig(root), {
      message: `Invalid .cachekeyrc.json: ${field} must be an array of strings.`
    });
  });

  test(`config rejects a non-string ${field} member`, (t) => {
    const root = withConfig(t, JSON.stringify({ [field]: ['valid', 2] }));
    assert.throws(() => loadConfig(root), {
      message: `Invalid .cachekeyrc.json: ${field}[1] must be a string.`
    });
  });
}

test('config merges valid fields with defaults', (t) => {
  const ignorePaths = ['vendor/examples'];
  const root = withConfig(t, JSON.stringify({ ignorePaths }));

  assert.deepEqual(loadConfig(root), {
    ignoreRules: DEFAULT_CONFIG.ignoreRules,
    lockfilePatterns: DEFAULT_CONFIG.lockfilePatterns,
    ignorePaths
  });
});

test('config uses defaults when the file is absent', (t) => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'cachekey-config-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));

  assert.equal(loadConfig(root), DEFAULT_CONFIG);
});
