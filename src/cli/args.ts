import type { Severity } from '../types.js';

export interface ParsedArgs {
  command: 'scan' | 'rules' | 'help';
  target: string;
  format: 'markdown' | 'json';
  out: string | undefined;
  failOn: Severity | undefined;
  ignoreRules: string[];
}

const severities = new Set<Severity>(['low', 'medium', 'high']);

export function parseArgs(argv: string[]): ParsedArgs {
  const args = [...argv];
  // Treat --help or -h as the help command regardless of position
  if (args.includes('--help') || args.includes('-h')) {
    return { command: 'help', target: '.github/workflows', format: 'markdown', out: undefined, failOn: undefined, ignoreRules: [] };
  }

  // No command provided: show help (not an error)
  if (args.length === 0) {
    return { command: 'help', target: '.github/workflows', format: 'markdown', out: undefined, failOn: undefined, ignoreRules: [] };
  }

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
  return `cachekey 0.1.0

Local-first CI cache auditor for GitHub Actions workflows.

Usage:
  cachekey scan [target] [--format markdown|json] [--out FILE] [--fail-on low|medium|high] [--ignore-rule RULE]
  cachekey rules

Examples:
  cachekey scan .github/workflows --out cache-report.md
  cachekey scan fixtures/risky/.github/workflows --format json --fail-on medium
  cachekey rules

Flags:
  -h, --help        Show this help text
  --format          Output format (markdown|json)
  --out             Write report to file
  --fail-on         Exit 1 when findings reach severity threshold
  --ignore-rule     Skip a rule by id

Safety:
  Scans workflow YAML and nearby lockfiles entirely offline.`;
}
