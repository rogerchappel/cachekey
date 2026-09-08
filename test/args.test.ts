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

test('parse scan args uses the default target when none is provided', () => {
  assert.equal(parseArgs(['scan']).target, '.github/workflows');
});

test('parse rejects a surplus target after the explicit default target', () => {
  assert.throws(() => parseArgs(['scan', '.github/workflows', 'fixtures/safe/.github/workflows']), {
    message: 'cachekey scan accepts at most one target positional.'
  });
});

test('parse rejects a surplus target after a non-default target', () => {
  assert.throws(() => parseArgs(['scan', 'fixtures/risky', 'fixtures/safe']), {
    message: 'cachekey scan accepts at most one target positional.'
  });
});

test('help text mentions commands', () => {
  assert.match(helpText(), /cachekey scan/);
  assert.match(helpText(), /cachekey rules/);
});

test('parse rejects an unknown ignore rule id', () => {
  assert.throws(() => parseArgs(['scan', '--ignore-rule', 'does-not-exist']), {
    message: 'Unknown rule id for --ignore-rule: "does-not-exist".'
  });
});
