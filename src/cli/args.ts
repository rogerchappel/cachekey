import type { Severity } from '../types.js';

export interface ParsedArgs {
  command: 'scan' | 'rules' | 'help';
  target: string;
  format: 'markdown' | 'json';
  out?: string;
  failOn?: Severity;
  ignoreRules: string[];
}

const severities = new Set<Severity>(['low', 'medium', 'high']);

export function parseArgs(argv: string[]): ParsedArgs {
  const args = [...argv];
  const command = (args.shift() as ParsedArgs['command'] | undefined) ?? 'help';

  if (!['scan', 'rules', 'help'].includes(command)) {
    throw new Error(`Unknown command: ${command}`);
  }

  let target = '.github/workflows';
  let format: ParsedArgs['format'] = 'markdown';
  let out: string | undefined;
  let failOn: Severity | undefined;
  const ignoreRules: string[] = [];

  while (args.length > 0) {
    const current = args.shift()!;
    if (!current.startsWith('--') && command === 'scan' && target === '.github/workflows') {
      target = current;
      continue;
    }

    switch (current) {
      case '--format': {
        const value = args.shift();
        if (value !== 'markdown' && value !== 'json') throw new Error('Expected --format markdown|json');
        format = value;
        break;
      }
      case '--out':
        out = args.shift();
        if (!out) throw new Error('Expected value after --out');
        break;
      case '--fail-on': {
        const value = args.shift() as Severity | undefined;
        if (!value || !severities.has(value)) throw new Error('Expected --fail-on low|medium|high');
        failOn = value;
        break;
      }
      case '--ignore-rule': {
        const value = args.shift();
        if (!value) throw new Error('Expected value after --ignore-rule');
        ignoreRules.push(value);
        break;
      }
      case '--help':
        return { command: 'help', target, format, out, failOn, ignoreRules };
      default:
        throw new Error(`Unknown flag: ${current}`);
    }
  }

  return { command, target, format, out, failOn, ignoreRules };
}

export function helpText(): string {
  return `cachekey\n\nUsage:\n  cachekey scan [target] [--format markdown|json] [--out FILE] [--fail-on low|medium|high] [--ignore-rule RULE]\n  cachekey rules\n`;
}
