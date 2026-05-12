import path from 'node:path';
import { walkFiles, toPosix } from '../utils/fs.js';

export function findLockfiles(root: string, patterns: string[]): string[] {
  const wanted = new Set(patterns);
  return walkFiles(root, (filePath) => wanted.has(path.basename(filePath))).map((filePath) => toPosix(path.relative(root, filePath)));
}
