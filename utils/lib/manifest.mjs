import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

export const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));

export async function loadInstance(id) {
  if (!id) throw new Error('Usage: pass an instance id from manifest.yaml');
  const manifest = parse(await readFile(path.join(REPO_ROOT, 'manifest.yaml'), 'utf8'));
  const instance = manifest.instances.find((i) => i.id === id);
  if (!instance) {
    const known = manifest.instances.map((i) => i.id).join(', ');
    throw new Error(`No instance "${id}" in manifest.yaml (known: ${known})`);
  }
  return {
    ...instance,
    sourceDir: path.join(REPO_ROOT, instance.directory),
    distDir: path.join(REPO_ROOT, 'dist', instance.id),
  };
}
