import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadInstance } from './lib/manifest.mjs';
import { bundleLayers, readCoverageList } from './lib/layers.mjs';
import { toDissolved, toTopojson } from './lib/derive.mjs';

const instance = await loadInstance(process.argv[2]);
const collection = await bundleLayers(instance.sourceDir);
const coverageList = await readCoverageList(instance.sourceDir);

const files = {
  'volume-extents.geojson': JSON.stringify(collection),
  'volume-extents.topojson': await toTopojson(collection, `${instance.id}-volume-extents`),
  'extents-dissolved.geojson': await toDissolved(collection),
};
if (coverageList) files['coverage-list.json'] = JSON.stringify(coverageList);

await rm(instance.distDir, { recursive: true, force: true });
await mkdir(instance.distDir, { recursive: true });
for (const [name, content] of Object.entries(files)) {
  await writeFile(path.join(instance.distDir, name), content);
  console.log(`wrote dist/${instance.id}/${name} (${Buffer.byteLength(content)} bytes)`);
}
console.log(`${collection.features.length} layers bundled for ${instance.id}`);
