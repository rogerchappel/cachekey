import path from 'node:path';
import { isMap, isSeq, LineCounter, parseDocument } from 'yaml';
import { isSubpath, readText, toPosix, walkFiles } from '../utils/fs.js';
import type { WorkflowCacheStep, WorkflowDocument } from '../types.js';

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

// actions/cache accepts path, key, and restore-keys as either a block scalar
// or a YAML sequence of the same lines. Keep both shapes: sequences collapse
// into newline-joined strings so the rules see one line per entry, and apply
// the same string-only exclusion around list entries as around scalars.
function normalizeWith(withValue: unknown): Record<string, string> {
  if (!withValue || typeof withValue !== 'object') return {};
  const normalized: Record<string, string> = {};
  for (const [name, value] of Object.entries(withValue as Record<string, unknown>)) {
    if (typeof value === 'string') {
      normalized[name] = value;
      continue;
    }
    if (Array.isArray(value)) {
      const entries = value.filter((entry): entry is string => typeof entry === 'string');
      if (entries.length > 0) normalized[name] = entries.join('\n');
    }
  }
  return normalized;
}

function actionIdentity(uses: string): string | undefined {
  const match = /^([^@\s]+)@([^@\s]+)$/.exec(uses);
  return match?.[1]?.toLowerCase();
}

const CACHE_ACTION_IDENTITIES = new Set(['actions/cache', 'actions/cache/restore', 'actions/cache/save']);

function extractSteps(file: string, raw: string): WorkflowCacheStep[] {
  const lineCounter = new LineCounter();
  const doc = parseDocument(raw, { lineCounter, prettyErrors: false });
  if (doc.errors.length > 0) {
    const details = doc.errors.map((error) => {
      const position = error.linePos?.[0] ?? lineCounter.linePos(error.pos[0]);
      const location = position ? `:${position.line}:${position.col}` : '';
      return `${file}${location}: ${error.message}`;
    });
    throw new Error(`Invalid workflow YAML:\n${details.join('\n')}`);
  }
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
      const withRecord = normalizeWith(stepRecord.with);
      const snippet = uses ?? JSON.stringify(withRecord);
      const usesNode = step.get('uses', true);
      const line = usesNode?.range ? lineCounter.linePos(usesNode.range[0]).line : 1;
      const identity = uses ? actionIdentity(uses) : undefined;

      if (uses && identity && CACHE_ACTION_IDENTITIES.has(identity)) {
        steps.push({ kind: 'actions-cache', uses, with: withRecord, reference: { file, line, snippet } });
      }

      if (uses && identity === 'actions/setup-node' && 'cache' in withRecord) {
        steps.push({ kind: 'setup-cache', uses, with: withRecord, reference: { file, line, snippet } });
      }
    }
  }

  return steps;
}

export function loadWorkflowDocuments(root: string, targetPath: string, ignorePaths: string[] = []): WorkflowDocument[] {
  const absoluteTarget = path.resolve(root, targetPath);
  const files = walkFiles(absoluteTarget, (filePath) => {
    if (!filePath.endsWith('.yml') && !filePath.endsWith('.yaml')) return false;
    return !isSubpath(toPosix(path.relative(root, filePath)), ignorePaths);
  });
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
