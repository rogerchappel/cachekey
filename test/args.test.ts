import test from 'node:test';
import assert from 'node:assert/strict';
import { helpText, parseArgs } from '../src/cli/args.ts';

test('parse scan args', () => {
  const parsed = parseArgs(['scan', 'fixtures/risky', '--format', 'json', '--fail-on', 'medium', '--ignore-rule', 'broad-restore-key']);
  assert.equal(parsed.command, 'scan');
  assert.equal(parsed.target, 'fixtures/risky');
  assert.equal(parsed.format, 'json');
  assert.equal(parsed.failOn, 'medium');
  assert.deepEqual(parsed.ignoreRules, ['broad-restore-key']);
});

test('help text mentions commands', () => {
  assert.match(helpText(), /cachekey scan/);
  assert.match(helpText(), /cachekey rules/);
});
