import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const source = fs.readFileSync(fileURLToPath(new URL('../demos/atmosferi-viz/portfolio-feed.js', import.meta.url)), 'utf8');
class Element {
  constructor(tag = 'figure') { this.tag = tag; this.dataset = {}; this.children = []; this.style = {}; }
  appendChild(el) { el.remove(); this.children.push(el); el.parentNode = this; return el; }
  remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(el => el !== this); this.parentNode = null; }
  getAttribute(name) { return name === 'data-full' ? this.dataset.full : null; }
  querySelectorAll() { return this.children; }
  insertBefore(fragment) { this.children = [...fragment.children, ...this.children]; this.children.forEach(el => el.parentNode = this); }
}
const grid = new Element('div');
for (const name of ['a', 'b', 'c']) { const el = new Element(); el.dataset.full = `img/${name}.webp`; grid.appendChild(el); }
const projectId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const imageId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const full = `${projectId}/${imageId}-full.webp`;
const controls = [
  { image_key: 'static:img/b.webp', hidden: true, sort_order: 3 },
  { image_key: 'static:img/c.webp', hidden: false, sort_order: 0 },
  { image_key: 'static:img/a.webp', hidden: false, sort_order: 2 },
  { image_key: `cms:${full}`, hidden: false, sort_order: 1 },
];
let refreshed = false;
const context = { Map, AbortSignal, console, CustomEvent: class {},
  document: { getElementById: id => id === 'grid' ? grid : null, createElement: tag => new Element(tag), createDocumentFragment: () => new Element('fragment') },
  window: { dispatchEvent: () => { refreshed = true; } },
  fetch: async url => ({ ok: true, json: async () => url.includes('visualization_gallery_controls') ? controls : [{ id: projectId, title: 'Uploaded project', images: [{ full, thumb: `${projectId}/${imageId}-thumb.webp`, width: 1600, height: 1000 }] }] }),
};
vm.runInNewContext(source, context);
await new Promise(resolve => setTimeout(resolve, 0));
assert.equal(refreshed, true, 'lightbox sources must refresh');
assert.deepEqual(grid.children.map(el => el.dataset.full), ['img/c.webp', `https://paryiowezqlnffanxtnt.supabase.co/storage/v1/object/public/visualization-portfolio/${full}`, 'img/a.webp']);
assert.equal(grid.children.some(el => el.dataset.full === 'img/b.webp'), false, 'hidden image must leave DOM and lightbox');
console.log('Gallery ordering, hiding, CMS merge and lightbox refresh passed');
