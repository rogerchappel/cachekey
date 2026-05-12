import type { ScanResult } from '../types.js';

export function renderMarkdown(result: ScanResult): string {
  const lines: string[] = [];
  lines.push('# CacheKey Report');
  lines.push('');
  lines.push(`- Target: \`${result.target}\``);
  lines.push(`- Scanned workflow files: ${result.scannedFiles.length}`);
  lines.push(`- Detected lockfiles: ${result.detectedLockfiles.length}`);
  lines.push(`- Findings: ${result.findings.length}`);
  lines.push('');

  if (result.detectedLockfiles.length > 0) {
    lines.push('## Lockfiles');
    lines.push('');
    for (const lockfile of result.detectedLockfiles) {
      lines.push(`- \`${lockfile}\``);
    }
    lines.push('');
  }

  if (result.findings.length === 0) {
    lines.push('## Findings');
    lines.push('');
    lines.push('No cache-key risks detected.');
    lines.push('');
    return `${lines.join('\n')}\n`;
  }

  lines.push('## Findings');
  lines.push('');
  for (const finding of result.findings) {
    lines.push(`### [${finding.severity.toUpperCase()}] ${finding.id} — ${finding.title}`);
    lines.push('');
    lines.push(`- File: \`${finding.file}:${finding.line}\``);
    lines.push(`- Snippet: \`${finding.snippet.replace(/`/g, '\\`')}\``);
    lines.push(`- Message: ${finding.message}`);
    lines.push(`- Remediation: ${finding.remediation}`);
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}
