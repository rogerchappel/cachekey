import path from 'node:path';
import { isMap, isSeq, LineCounter, parseDocument } from 'yaml';
import { readText, toPosix, walkFiles } from '../utils/fs.js';
import type { WorkflowCacheStep, WorkflowDocument } from '../types.js';

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function actionIdentity(uses: string): string | undefined {
  const separator = uses.indexOf('@');
  if (separator <= 0 || separator === uses.length - 1) return undefined;
  return uses.slice(0, separator).toLowerCase();
}

function extractSteps(file: string, raw: string): WorkflowCacheStep[] {
  const lineCounter = new LineCounter();
  const doc = parseDocument(raw, { lineCounter, prettyErrors: false });
  if (!isMap(doc.contents)) return [];
  const jobs = doc.contents.get('jobs', true);
  if (!isMap(jobs)) return [];

  const steps: WorkflowCacheStep[] = [];
  for (const jobPair of jobs.items) {
    const job = jobPair.value;
    if (!isMap(job)) continue;
    const stepList = job.get('steps', true);
    if (!isSeq(stepList)) continue;

    for (const step of stepList.items) {
      if (!isMap(step)) continue;
      const stepRecord = step.toJSON() as Record<string, unknown>;
      const uses = stringValue(stepRecord.uses);
      const withRecord = Object.fromEntries(
        Object.entries(stepRecord.with && typeof stepRecord.with === 'object' ? (stepRecord.with as Record<string, unknown>) : {})
          .filter(([, value]) => typeof value === 'string') as Array<[string, string]>
      );
      const snippet = uses ?? JSON.stringify(withRecord);
      const usesNode = step.get('uses', true);
      const line = usesNode?.range ? lineCounter.linePos(usesNode.range[0]).line : 1;
      const identity = uses ? actionIdentity(uses) : undefined;

      if (uses && identity === 'actions/cache') {
        steps.push({ kind: 'actions-cache', uses, with: withRecord, reference: { file, line, snippet } });
      }

      if (uses && identity === 'actions/setup-node' && 'cache' in withRecord) {
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
