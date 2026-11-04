import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Vercel's convention: 0 skips a build, 1 builds it. Never skip production.
// SEO checks still run in GitHub Actions; merging to main publishes the content.
let skip = false;
if (process.env.VERCEL_ENV === 'preview' && /^seo[-/]/.test(process.env.VERCEL_GIT_COMMIT_REF || '')) {
  try {
    const git = (...args) => execFileSync('git', args, { encoding: 'utf8', timeout: 10000, stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    try {
      git('merge-base', 'HEAD', 'origin/main');
    } catch {
      // Vercel may clone just the feature branch. Fetch only the comparison ref.
      git('fetch', '--no-tags', '--depth=100', 'origin', 'main:refs/remotes/origin/main');
    }
    const base = git('merge-base', 'HEAD', 'origin/main');
    const files = git('diff', '--name-only', '-z', base, 'HEAD').split('\0').filter(Boolean);
    skip = files.length > 0 && files.every(file => {
      if (['sitemap.xml', 'assets/seo-guides.css', '.github/workflows/seo-content-check.yml'].includes(file)) return true;
      if (/^(?:docs\/).*\.(?:md|txt)$/.test(file)) return true;
      if (!/^[^/]+\.html$/.test(file)) return false;
      // Only editorial articles, never homepage, portfolios or demo pages.
      return /"@type"\s*:\s*"Article"/.test(readFileSync(file, 'utf8'));
    });
  } catch {
    // Missing history, removed files or unknown changes: retain the preview.
    skip = false;
  }
}
console.log(skip ? 'Skip SEO-only preview; production publishing and CI remain enabled.' : 'Build this deployment.');
process.exit(skip ? 0 : 1);
