import { existsSync } from 'node:fs';
import path from 'node:path';
import { DEFAULT_CONFIG } from './defaults.js';
import { readText } from '../utils/fs.js';
import type { ScanConfig } from '../types.js';
import { isRuleId } from '../core/rules.js';

interface RawConfig {
  ignoreRules?: string[];
  lockfilePatterns?: string[];
  ignorePaths?: string[];
}

const ARRAY_FIELDS = ['ignoreRules', 'lockfilePatterns', 'ignorePaths'] as const;

function parseConfig(contents: string): RawConfig {
  let value: unknown;
  try {
    value = JSON.parse(contents);
  } catch {
    throw new Error('Invalid .cachekeyrc.json: malformed JSON.');
  }

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Invalid .cachekeyrc.json: expected an object.');
  }

  const raw = value as Record<string, unknown>;
  const unknownKey = Object.keys(raw).find(
    (key) => !ARRAY_FIELDS.includes(key as (typeof ARRAY_FIELDS)[number])
  );
  if (unknownKey !== undefined) {
    throw new Error(`Invalid .cachekeyrc.json: unknown top-level key "${unknownKey}".`);
  }

  for (const field of ARRAY_FIELDS) {
    const entries = raw[field];
    if (entries === undefined) continue;
    if (!Array.isArray(entries)) {
      throw new Error(`Invalid .cachekeyrc.json: ${field} must be an array of strings.`);
    }
    const invalidIndex = entries.findIndex((entry) => typeof entry !== 'string');
    if (invalidIndex !== -1) {
      throw new Error(`Invalid .cachekeyrc.json: ${field}[${invalidIndex}] must be a string.`);
    }
    if (field === 'ignoreRules') {
      const unknownRuleIndex = entries.findIndex((entry) => !isRuleId(entry as string));
      if (unknownRuleIndex !== -1) {
        throw new Error(
          `Invalid .cachekeyrc.json: ignoreRules[${unknownRuleIndex}] has unknown rule id "${entries[unknownRuleIndex]}".`
        );
      }
    }
  }

  return raw as RawConfig;
}

export function loadConfig(cwd: string): ScanConfig {
  const configPath = path.join(cwd, '.cachekeyrc.json');
  if (!existsSync(configPath)) {
    return DEFAULT_CONFIG;
  }

  const raw = parseConfig(readText(configPath));
  return {
    ignoreRules: raw.ignoreRules ?? DEFAULT_CONFIG.ignoreRules,
    lockfilePatterns: raw.lockfilePatterns ?? DEFAULT_CONFIG.lockfilePatterns,
    ignorePaths: raw.ignorePaths ?? DEFAULT_CONFIG.ignorePaths
  };
}
