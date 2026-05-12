import path from 'node:path';
import { loadConfig } from '../config/load-config.js';
import { findLockfiles } from './lockfiles.js';
import { evaluateRules } from './rules.js';
import { loadWorkflowDocuments } from './workflow-parser.js';
import { isSubpath } from '../utils/fs.js';
import type { ScanResult, Severity } from '../types.js';

export interface ScanOptions {
  cwd: string;
  target: string;
  ignoreRules: string[];
}

const severityRank: Record<Severity, number> = {
  low: 1,
  medium: 2,
  high: 3
};

export function scanTarget(options: ScanOptions): ScanResult {
  const config = loadConfig(options.cwd);
  const mergedConfig = {
    ...config,
    ignoreRules: [...new Set([...config.ignoreRules, ...options.ignoreRules])]
  };

  const target = path.resolve(options.cwd, options.target);
  const workflows = loadWorkflowDocuments(options.cwd, target);
  const lockfiles = findLockfiles(options.cwd, mergedConfig.lockfilePatterns);

  const findings = workflows.flatMap((workflow) =>
    workflow.steps.flatMap((step) =>
      evaluateRules({ workflow, step, config: mergedConfig, lockfiles })
    )
  ).filter((finding) => !isSubpath(finding.file, mergedConfig.ignorePaths))
   .sort((a, b) => severityRank[b.severity] - severityRank[a.severity] || a.file.localeCompare(b.file) || a.line - b.line);

  return {
    target: path.relative(options.cwd, target) || '.',
    findings,
    scannedFiles: workflows.map((workflow) => workflow.file),
    detectedLockfiles: lockfiles
  };
}

export function shouldFail(findings: ScanResult['findings'], threshold: Severity): boolean {
  return findings.some((finding) => severityRank[finding.severity] >= severityRank[threshold]);
}
