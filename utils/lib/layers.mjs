import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

// Reference layers go last in the bundle.
const LAYER_DIRS = ['atlas-layers', 'reference-layers'];

export function filenameFor(identifier) {
  const base = identifier.startsWith('ark:') ? identifier.split('/').pop() : identifier;
  return `${base}.json`;
}

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (err) {
    throw new Error(`Could not read ${file}: ${err.message}`);
  }
}

async function readLayerDir(dir) {
  let names;
  try {
    names = await readdir(dir);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
  const files = names.filter((n) => n.endsWith('.json')).sort();
  return Promise.all(
    files.map(async (name) => ({ file: path.join(dir, name), feature: await readJson(path.join(dir, name)) })),
  );
}

function checkLayers(entries) {
  const errors = [];
  const seen = new Map();
  for (const { file, feature } of entries) {
    const identifier = feature?.properties?.identifier;
    if (typeof identifier !== 'string') {
      errors.push(`${file}: missing properties.identifier`);
      continue;
    }
    if (path.basename(file) !== filenameFor(identifier)) {
      errors.push(`${file}: filename should be ${filenameFor(identifier)} for identifier ${identifier}`);
    }
    if (seen.has(identifier)) errors.push(`${file}: identifier ${identifier} duplicates ${seen.get(identifier)}`);
    seen.set(identifier, file);
  }
  if (errors.length) throw new Error(`Layer check failed:\n  ${errors.join('\n  ')}`);
}

export async function bundleLayers(sourceDir) {
  const groups = await Promise.all(LAYER_DIRS.map((d) => readLayerDir(path.join(sourceDir, d))));
  const entries = groups.flat();
  if (!entries.length) throw new Error(`No layer files found in ${sourceDir}`);
  checkLayers(entries);
  return { type: 'FeatureCollection', features: entries.map((e) => e.feature) };
}

export async function readCoverageList(sourceDir) {
  const file = path.join(sourceDir, 'coverage-list.json');
  try {
    await readFile(file);
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
  return readJson(file);
}
