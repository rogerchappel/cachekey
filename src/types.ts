export type Severity = 'low' | 'medium' | 'high';

export interface WorkflowReference {
  file: string;
  line: number;
  snippet: string;
}

export interface Finding extends WorkflowReference {
  id: string;
  severity: Severity;
  title: string;
  message: string;
  remediation: string;
}

export interface WorkflowCacheStep {
  kind: 'actions-cache' | 'setup-cache';
  uses?: string;
  with: Record<string, string>;
  reference: WorkflowReference;
}

export interface WorkflowDocument {
  file: string;
  raw: string;
  steps: WorkflowCacheStep[];
}

export interface ScanConfig {
  ignoreRules: string[];
  lockfilePatterns: string[];
  ignorePaths: string[];
}

export interface ScanResult {
  target: string;
  findings: Finding[];
  scannedFiles: string[];
  detectedLockfiles: string[];
}

export interface RuleContext {
  workflow: WorkflowDocument;
  step: WorkflowCacheStep;
  config: ScanConfig;
  lockfiles: string[];
}
