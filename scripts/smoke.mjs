import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');
const outDir = path.join(repoRoot, 'tmp', 'smoke');
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const markdownReport = path.join(outDir, 'risky.md');
const jsonReport = path.join(outDir, 'safe.json');

execFileSync('node', ['dist/cli.js', 'scan', 'fixtures/risky/.github/workflows', '--out', markdownReport], { cwd: repoRoot, stdio: 'inherit' });
execFileSync('node', ['dist/cli.js', 'scan', 'fixtures/safe/.github/workflows', '--format', 'json', '--out', jsonReport], { cwd: repoRoot, stdio: 'inherit' });
writeFileSync(path.join(outDir, 'README.txt'), 'Smoke run completed.\n', 'utf8');
