import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Vercel's convention: 0 skips a build, 1 builds it.
// Production skips ONLY when every change since the last deployed commit is
// backend/admin-independent and cannot alter the published site output.
// Compare against VERCEL_GIT_PREVIOUS_SHA, not HEAD^; intervening content
// commits may not have deployed after Vercel throttling. Fail open to build.
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
// A monitoring-script or GitHub-workflow change alone must not consume another
// production build, particularly when repeated SEO previews trigger limits.
if (process.env.VERCEL_ENV === 'production') {
  skip = false;
  try {
    const previous = process.env.VERCEL_GIT_PREVIOUS_SHA || '';
    if (/^[0-9a-f]{40}$/i.test(previous)) {
      const git = (...args) => execFileSync('git', args, {
        encoding: 'utf8', timeout: 10000, stdio: ['ignore', 'pipe', 'ignore']
      }).trim();
      try {
        git('cat-file', '-e', previous + '^{commit}');
      } catch {
        // Vercel uses a shallow clone. If the prior deployment commit cannot
        // be fetched, build instead; never guess at the diff.
        git('fetch', '--no-tags', '--depth=25', 'origin', previous);
        git('cat-file', '-e', previous + '^{commit}');
      }
      // A previous deployment from a different branch is not a safe baseline.
      git('merge-base', '--is-ancestor', previous, 'HEAD');
      const files = git('diff', '--name-only', '-z', previous, 'HEAD')
        .split('\0').filter(Boolean);
      const nonPublicOnly = file =>
        file === 'AGENTS.md' || file === 'README.md' ||
        /^docs\/.*\.(?:md|txt)$/.test(file) ||
        /^\.github\/workflows\/.*\.(?:yml|yaml)$/.test(file) ||
        /^scripts\/gsc\//.test(file) ||
        /^supabase\//.test(file);
      skip = files.length > 0 && files.every(nonPublicOnly);
    }
  } catch {
    // Unknown base, shallow history, network issue or an unexpected file:
    // retain normal publishing rather than risk hiding an SEO content update.
    skip = false;
  }
}
console.log(skip ? 'Skipped safely: no publishable site files changed.' : 'Build this deployment.');
process.exit(skip ? 0 : 1);
