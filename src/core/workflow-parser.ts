import path from 'node:path';
import { parseDocument } from 'yaml';
import { readText, toPosix, walkFiles } from '../utils/fs.js';
import type { WorkflowCacheStep, WorkflowDocument } from '../types.js';

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function getLine(raw: string, needle: string): number {
  const index = raw.indexOf(needle);
  if (index === -1) return 1;
  return raw.slice(0, index).split('\n').length;
}

function extractSteps(file: string, raw: string): WorkflowCacheStep[] {
  const doc = parseDocument(raw, { prettyErrors: false });
  const root = doc.toJSON() as Record<string, unknown> | null;
  if (!root || typeof root !== 'object') return [];
  const jobs = root.jobs;
  if (!jobs || typeof jobs !== 'object') return [];

  const steps: WorkflowCacheStep[] = [];
  for (const job of Object.values(jobs as Record<string, unknown>)) {
    if (!job || typeof job !== 'object') continue;
    const stepList = (job as Record<string, unknown>).steps;
    if (!Array.isArray(stepList)) continue;

    for (const step of stepList) {
      if (!step || typeof step !== 'object') continue;
      const stepRecord = step as Record<string, unknown>;
      const uses = stringValue(stepRecord.uses);
      const withRecord = Object.fromEntries(
        Object.entries(stepRecord.with && typeof stepRecord.with === 'object' ? (stepRecord.with as Record<string, unknown>) : {})
          .filter(([, value]) => typeof value === 'string') as Array<[string, string]>
      );
      const snippet = uses ?? JSON.stringify(withRecord);
      const line = getLine(raw, uses ?? Object.values(withRecord)[0] ?? '-');

      if (uses?.startsWith('actions/cache')) {
        steps.push({ kind: 'actions-cache', uses, with: withRecord, reference: { file, line, snippet } });
      }

      if (uses?.includes('setup-node') && 'cache' in withRecord) {
        steps.push({ kind: 'setup-cache', uses, with: withRecord, reference: { file, line, snippet } });
      }
    }
  }

  return steps;
}

export function loadWorkflowDocuments(root: string, targetPath: string): WorkflowDocument[] {
  const absoluteTarget = path.resolve(root, targetPath);
  const files = walkFiles(absoluteTarget, (filePath) => filePath.endsWith('.yml') || filePath.endsWith('.yaml'));
  return files.map((filePath) => {
    const raw = readText(filePath);
    const relativeFile = toPosix(path.relative(root, filePath));
    return {
      file: relativeFile,
      raw,
      steps: extractSteps(relativeFile, raw)
    };
  });
}
