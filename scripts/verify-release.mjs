import { access, readFile } from 'node:fs/promises';

import { parse } from 'yaml';

const root = new URL('../', import.meta.url);
const pkg = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
const workflow = parse(await readFile(new URL('.github/workflows/release.yml', root), 'utf8'));
const steps = workflow.jobs?.release?.steps ?? [];

const findStep = (name) => steps.findIndex((step) => step.name === name);
const setup = steps.find((step) => String(step.uses).startsWith('actions/setup-node@'));
const trustedPublishingNpm = steps.find((step) => step.name === 'Install npm with trusted publishing support');
const packIndex = findStep('Build package');
const verifyIndex = findStep('Verify release contract');
const publishIndex = findStep('Publish package to npm');
const releaseIndex = findStep('Create GitHub release');

if (setup?.with?.['registry-url'] !== 'https://registry.npmjs.org') {
  throw new Error('release workflow must use the npmjs registry');
}
if (!String(trustedPublishingNpm?.run).includes('npm@11.5.1')) {
  throw new Error('release workflow must install an npm CLI with trusted publishing support');
}
if (workflow.permissions?.contents !== 'write' || workflow.permissions?.['id-token'] !== 'write') {
  throw new Error('release workflow must grant only contents: write and id-token: write');
}
if (Object.keys(workflow.permissions).length !== 2) {
  throw new Error('release workflow has permissions beyond contents and id-token');
}
if (!(packIndex >= 0 && packIndex < verifyIndex && verifyIndex < publishIndex && publishIndex < releaseIndex)) {
  throw new Error('release steps must pack, verify, publish, then create the GitHub release');
}

const publish = String(steps[publishIndex].run);
if (!publish.includes('npm publish') || !publish.includes('npm-pack.json') ||
    !publish.includes('--provenance') || !publish.includes('--access public')) {
  throw new Error('npm publish must publish the recorded tarball publicly with provenance');
}

const metadataPath = process.argv[2];
if (metadataPath) {
  const [packed] = JSON.parse(await readFile(metadataPath, 'utf8'));
  if (packed?.name !== pkg.name || packed?.version !== pkg.version) {
    throw new Error(`packed identity ${packed?.name}@${packed?.version} does not match ${pkg.name}@${pkg.version}`);
  }
  if (!packed.filename?.endsWith('.tgz')) throw new Error('npm pack did not report a tarball');
  await access(new URL(packed.filename, root));
  console.log(`verified packed artifact ${packed.filename} as ${pkg.name}@${pkg.version}`);
}

console.log('verified npm registry, least privilege, provenance, and publish-before-release ordering');
