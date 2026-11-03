import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'demos/atmosferi-viz/index.html'), 'utf8');
const gallery = html.split('id="grid"')[1]?.split('</section>')[0];
if (!gallery) throw new Error('Visualisation gallery not found');
const decode = value => value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const items = [...gallery.matchAll(/<figure\b([^>]*data-full="[^"]+"[^>]*)>/g)].map(([, attrs]) => {
  const get = key => decode(attrs.match(new RegExp(`${key}="([^"]*)"`))?.[1] || '');
  const full = get('data-full');
  return { key: `static:${full}`, src: `/demos/atmosferi-viz/${full}`, title: get('data-project-title') || get('data-cap'), caption: get('data-cap') };
});
if (!items.length || new Set(items.map(x => x.key)).size !== items.length) throw new Error('Invalid gallery inventory');
fs.mkdirSync(path.join(root, 'admin/src/data'), { recursive: true });
fs.writeFileSync(path.join(root, 'admin/src/data/visualization-gallery.ts'), 'export default ' + JSON.stringify(items, null, 2) + ';\n');
console.log(`Gallery inventory: ${items.length} images`);
