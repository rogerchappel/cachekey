import { execFile } from 'node:child_process';
import { accessSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

for (const [name, target] of Object.entries(pkg.bin ?? {})) {
  const binUrl = new URL(`../${target}`, import.meta.url);
  accessSync(binUrl);
  const { stdout } = await execFileAsync('node', [fileURLToPath(binUrl), '--version']);
  if (stdout.trim() !== pkg.version) {
    throw new Error(`bin ${name} --version returned ${JSON.stringify(stdout.trim())}, expected ${pkg.version}`);
  }
  console.log(`verified bin ${name} -> ${target} (${pkg.version})`);
}

for (const entry of ['dist', 'docs', 'examples', 'README.md', 'LICENSE', 'SECURITY.md', 'CHANGELOG.md', 'CONTRIBUTING.md']) {
  if (!pkg.files?.includes(entry)) {
    throw new Error(`package files allowlist is missing ${entry}`);
  }
}

for (const path of ['../examples/cachekey.config.json', '../docs/README.md']) {
  accessSync(new URL(path, import.meta.url));
}

for (const field of ['repository', 'bugs', 'homepage', 'license']) {
  if (!pkg[field]) {
    throw new Error(`package metadata is missing ${field}`);
  }
}

console.log('verified package metadata, docs, examples, and files allowlist');
