import path from 'node:path';
import { parseDocument, isMap, isSeq, type ParsedNode } from 'yaml';
import { readText, toPosix, walkFiles } from '../utils/fs.js';
import type { WorkflowCacheStep, WorkflowDocument } from '../types.js';

function asString(node: ParsedNode | null | undefined): string | undefined {
  if (!node) return undefined;
  if ('value' in node && typeof node.value === 'string') {
    return node.value;
  }
  return undefined;
}

function getLine(raw: string, needle: string): number {
  const index = raw.indexOf(needle);
  if (index === -1) return 1;
  return raw.slice(0, index).split('\n').length;
}

function readWithMap(mapNode: ParsedNode | null | undefined): Record<string, string> {
  if (!mapNode || !isMap(mapNode)) return {};
  const record: Record<string, string> = {};
  for (const item of mapNode.items) {
    const key = asString(item.key);
    const value = asString(item.value);
    if (key && value) {
      record[key] = value;
    }
  }
  return record;
}

function extractSteps(file: string, raw: string): WorkflowCacheStep[] {
  const doc = parseDocument(raw, { prettyErrors: false });
  const root = doc.contents;
  if (!root || !isMap(root)) return [];
  const jobs = root.get('jobs', true);
  if (!jobs || !isMap(jobs)) return [];

  const steps: WorkflowCacheStep[] = [];
  for (const job of jobs.items) {
    if (!job.value || !isMap(job.value)) continue;
    const stepsNode = job.value.get('steps', true);
    if (!stepsNode || !isSeq(stepsNode)) continue;

    for (const stepNode of stepsNode.items) {
      if (!isMap(stepNode)) continue;
      const uses = asString(stepNode.get('uses', true));
      const withRecord = readWithMap(stepNode.get('with', true));
      const snippet = uses ?? JSON.stringify(withRecord);
      const line = getLine(raw, uses ?? Object.values(withRecord)[0] ?? '-');

      if (uses?.startsWith('actions/cache')) {
        steps.push({
          kind: 'actions-cache',
          uses,
          with: withRecord,
          reference: { file, line, snippet }
        });
      }

      if (uses?.includes('setup-node') && 'cache' in withRecord) {
        steps.push({
          kind: 'setup-cache',
          uses,
          with: withRecord,
          reference: { file, line, snippet }
        });
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
