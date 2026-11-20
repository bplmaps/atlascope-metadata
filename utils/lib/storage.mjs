import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

// Credentials come from AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY in the environment.
export async function upload(localPath, { endpoint, region, bucket }, key) {
  const dest = `s3://${bucket}/${key}`;
  try {
    await run('aws', ['s3', 'cp', localPath, dest, '--endpoint-url', endpoint, '--region', region, '--only-show-errors']);
  } catch (err) {
    throw new Error(`Upload to ${dest} failed: ${err.stderr || err.message}`);
  }
  return dest;
}
