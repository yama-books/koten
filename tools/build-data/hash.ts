import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
export const sha256 = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex');
export const sourceHashes = (files: string[]) => Object.fromEntries(files.map((file) => [path.basename(file), sha256(file)]));
