import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
// Same public marker on Vercel and in GitHub Actions. No secrets stored.
const sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error('Cannot resolve the published Git commit');
fs.writeFileSync('release-sha.txt', sha + '\n');
console.log('Prepared public release marker for commit ' + sha.slice(0, 12));
