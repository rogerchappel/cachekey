import type { Finding, RuleContext, Severity } from '../types.js';

interface RuleDefinition {
  id: string;
  title: string;
  severity: Severity;
  evaluate(context: RuleContext): Finding | null;
}

const DANGEROUS_PATHS = [/\.npmrc/, /\.env/, /secrets?/i, /credentials?/i, /\.ssh/];
const BUILD_OUTPUT_PATHS = [/dist\/?$/, /build\/?$/, /coverage\/?$/, /target\/?$/];

function makeFinding(context: RuleContext, definition: RuleDefinition, message: string, remediation: string): Finding {
  return {
    id: definition.id,
    severity: definition.severity,
    title: definition.title,
    message,
    remediation,
    ...context.step.reference
  };
}

const rules: RuleDefinition[] = [
  {
    id: 'missing-lock-hash',
    title: 'Cache key misses lockfile hash',
    severity: 'high',
    evaluate(context) {
      if (context.step.kind !== 'actions-cache') return null;
      const key = context.step.with.key ?? '';
      if (!key) {
        return makeFinding(context, this, 'Cache step does not define a key.', 'Define a deterministic key that includes runner/os and a lockfile hash.');
      }
      const hasHash = key.includes('hashFiles(');
      if (hasHash || context.lockfiles.length === 0) return null;
      return makeFinding(context, this, `Key \`${key}\` does not include hashFiles(...) despite detected lockfiles.`, 'Include hashFiles() for at least one relevant lockfile so dependency changes bust the cache.');
    }
  },
  {
    id: 'broad-restore-key',
    title: 'Restore key is too broad',
    severity: 'medium',
    evaluate(context) {
      const restore = context.step.with['restore-keys'] ?? '';
      if (!restore) return null;
      const lines = restore.split('\n').map((line) => line.trim()).filter(Boolean);
      const broad = lines.find((line) => /^\$\{\{\s*runner\.os\s*\}\}-?$/.test(line) || line.endsWith('-'));
      if (!broad) return null;
      return makeFinding(context, this, `Restore key \`${broad}\` may pull stale caches across branches or lockfile revisions.`, 'Narrow restore keys with language, dependency manager, branch, or partial lockfile fingerprints.');
    }
  },
  {
    id: 'dangerous-cache-path',
    title: 'Dangerous path cached',
    severity: 'high',
    evaluate(context) {
      const cachePath = context.step.with.path ?? context.step.with['cache-dependency-path'] ?? '';
      if (!cachePath) return null;
      const hit = cachePath.split('\n').map((line) => line.trim()).find((line) => DANGEROUS_PATHS.some((pattern) => pattern.test(line)));
      if (!hit) return null;
      return makeFinding(context, this, `Cache path \`${hit}\` may include secrets or machine-specific credentials.`, 'Cache package directories only; never cache dotfiles that can hold credentials or tokens.');
    }
  },
  {
    id: 'mutable-build-output',
    title: 'Mutable build output cached',
    severity: 'medium',
    evaluate(context) {
      const cachePath = context.step.with.path ?? '';
      const hit = cachePath.split('\n').map((line) => line.trim()).find((line) => BUILD_OUTPUT_PATHS.some((pattern) => pattern.test(line)));
      if (!hit) return null;
      return makeFinding(context, this, `Cache path \`${hit}\` stores build output that can become stale or branch-specific.`, 'Prefer caching package manager state instead of compiled artifacts unless you also encode exact source/version inputs.');
    }
  },
  {
    id: 'setup-cache-missing-dependency-path',
    title: 'setup-node cache lacks dependency path',
    severity: 'low',
    evaluate(context) {
      if (context.step.kind !== 'setup-cache') return null;
      const manager = context.step.with.cache;
      if (!manager || context.step.with['cache-dependency-path']) return null;
      return makeFinding(context, this, `setup-node cache for \`${manager}\` does not set cache-dependency-path.`, 'Set cache-dependency-path so monorepos and non-default lockfile locations are hashed correctly.');
    }
  }
];

export function evaluateRules(context: RuleContext): Finding[] {
  return rules
    .filter((rule) => !context.config.ignoreRules.includes(rule.id))
    .map((rule) => rule.evaluate(context))
    .filter((finding): finding is Finding => finding !== null);
}

export function listRules(): Array<Pick<RuleDefinition, 'id' | 'title' | 'severity'>> {
  return rules.map(({ id, title, severity }) => ({ id, title, severity }));
}
