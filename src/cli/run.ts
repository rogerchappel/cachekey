import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs, helpText } from './args.js';
import { scanTarget, shouldFail } from '../core/scanner.js';
import { renderMarkdown } from '../reporters/markdown.js';
import { renderJson } from '../reporters/json.js';
import { listRules } from '../core/rules.js';

export function run(argv: string[], cwd = process.cwd()): { exitCode: number; stdout: string; stderr: string } {
  try {
    const parsed = parseArgs(argv);

    if (parsed.command === 'help') {
      return { exitCode: 0, stdout: helpText(), stderr: '' };
    }

    if (parsed.command === 'rules') {
      const lines = listRules().map((rule) => `${rule.id}\t${rule.severity}\t${rule.title}`);
      return { exitCode: 0, stdout: `${lines.join('\n')}\n`, stderr: '' };
    }

    const result = scanTarget({ cwd, target: parsed.target, ignoreRules: parsed.ignoreRules });
    const output = parsed.format === 'json' ? renderJson(result) : renderMarkdown(result);

    if (parsed.out) {
      const outPath = path.resolve(cwd, parsed.out);
      mkdirSync(path.dirname(outPath), { recursive: true });
      writeFileSync(outPath, output, 'utf8');
    }

    const exitCode = parsed.failOn && shouldFail(result.findings, parsed.failOn) ? 1 : 0;
    return { exitCode, stdout: output, stderr: '' };
  } catch (error) {
    return {
      exitCode: 1,
      stdout: '',
      stderr: `${error instanceof Error ? error.message : String(error)}\n${helpText()}`
    };
  }
}
