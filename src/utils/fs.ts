import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const DEFAULT_SKIP = new Set(['.git', 'node_modules', 'dist', 'coverage']);

export function readText(filePath: string): string {
  return readFileSync(filePath, 'utf8');
}

export function walkFiles(root: string, predicate: (filePath: string) => boolean): string[] {
  const entries: string[] = [];

  function visit(currentPath: string): void {
    const stats = statSync(currentPath);
    if (stats.isDirectory()) {
      const base = path.basename(currentPath);
      if (DEFAULT_SKIP.has(base)) {
        return;
      }

      for (const entry of readdirSync(currentPath)) {
        visit(path.join(currentPath, entry));
      }
      return;
    }

    if (predicate(currentPath)) {
      entries.push(currentPath);
    }
  }

  visit(root);
  return entries.sort();
}

export function toPosix(filePath: string): string {
  return filePath.split(path.sep).join('/');
}

export function isSubpath(filePath: string, patterns: string[]): boolean {
  const posix = toPosix(filePath);
  return patterns.some((pattern) => posix.includes(pattern));
}
