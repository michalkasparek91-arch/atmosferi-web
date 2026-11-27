import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const origin = 'https://www.atmosferi.com';
function output(ready, sha = '') {
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, 'ready=' + ready + '\n');
    if (sha) fs.appendFileSync(process.env.GITHUB_OUTPUT, 'sha=' + sha + '\n');
  }
}
let response;
try {
  response = await fetch(origin + '/release-sha.txt', {
    redirect: 'error',
    signal: AbortSignal.timeout(20000),
    headers: { 'Cache-Control': 'no-cache' }
  });
} catch (error) {
  throw new Error('Cannot check the public release marker: ' + error.message);
}
if (response.status === 404) {
  console.log('::notice::Release marker is not yet deployed. Skipping this cycle; no URL submission.');
  output(false);
  process.exit(0);
}
if (!response.ok) throw new Error('Production marker returned HTTP ' + response.status);
const sha = (await response.text()).trim();
if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error('Invalid release SHA served from production');
try {
  execFileSync('git', ['cat-file', '-e', sha + '^{commit}'], { stdio: 'ignore' });
  execFileSync('git', ['merge-base', '--is-ancestor', sha, 'HEAD'], { stdio: 'ignore' });
} catch {
  console.log('::notice::Live release is not a known ancestor of main. Notifying is disabled until the deployment matches this repository.');
  output(false);
  process.exit(0);
}
console.log('Verified live release: ' + sha.slice(0, 12));
output(true, sha);
