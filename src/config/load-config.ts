import { existsSync } from 'node:fs';
import path from 'node:path';
import { DEFAULT_CONFIG } from './defaults.js';
import { readText } from '../utils/fs.js';
import type { ScanConfig } from '../types.js';

interface RawConfig {
  ignoreRules?: string[];
  lockfilePatterns?: string[];
  ignorePaths?: string[];
}

export function loadConfig(cwd: string): ScanConfig {
  const configPath = path.join(cwd, '.cachekeyrc.json');
  if (!existsSync(configPath)) {
    return DEFAULT_CONFIG;
  }

  const raw = JSON.parse(readText(configPath)) as RawConfig;
  return {
    ignoreRules: raw.ignoreRules ?? DEFAULT_CONFIG.ignoreRules,
    lockfilePatterns: raw.lockfilePatterns ?? DEFAULT_CONFIG.lockfilePatterns,
    ignorePaths: raw.ignorePaths ?? DEFAULT_CONFIG.ignorePaths
  };
}
