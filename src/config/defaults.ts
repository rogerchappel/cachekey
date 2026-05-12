import type { ScanConfig } from '../types.js';

export const DEFAULT_LOCKFILE_PATTERNS = [
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'poetry.lock',
  'Cargo.lock',
  'go.sum'
];

export const DEFAULT_CONFIG: ScanConfig = {
  ignoreRules: [],
  lockfilePatterns: DEFAULT_LOCKFILE_PATTERNS,
  ignorePaths: []
};
