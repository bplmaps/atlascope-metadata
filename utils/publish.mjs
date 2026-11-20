import { access } from 'node:fs/promises';
import path from 'node:path';
import { loadInstance } from './lib/manifest.mjs';
import { OUTPUTS } from './lib/outputs.mjs';
import { upload } from './lib/storage.mjs';

const instance = await loadInstance(process.argv[2]);
const { targets } = instance;

const exists = (file) => access(file).then(() => true, () => false);

const missing = ['endpoint', 'region', 'bucket', ...OUTPUTS.filter((o) => o.required).map((o) => o.target)]
  .filter((key) => !targets?.[key]);
if (missing.length) {
  throw new Error(`manifest.yaml targets for ${instance.id} are not configured: ${missing.join(', ')}`);
}

const plan = [];
for (const output of OUTPUTS) {
  const local = path.join(instance.distDir, output.file);
  const present = await exists(local);
  if (output.required && !present) throw new Error(`${local} is missing; run build first`);
  if (!present) continue;
  if (!targets[output.target]) throw new Error(`${output.file} was built but targets.${output.target} is null`);
  plan.push({ local, key: targets[output.target] });
}

for (const { local, key } of plan) {
  console.log(`uploaded ${await upload(local, targets, key)}`);
}
