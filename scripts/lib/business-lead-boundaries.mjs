import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { workDir } from './de-agency-plan.mjs';

// VG250 is generalized. Leave a margin around its edges so a street on a
// municipal boundary is never assigned from these polygons alone.
export function municipalBoundaryIndex() {
  const grid = new Map();
  const cell = n => Math.floor(n * 10);
  const key = (x,y) => x + ',' + y;
  function add(id, geometry) {
    if (!id || !['MultiPolygon','Polygon'].includes(geometry?.type)) throw new Error('Neplatná hranice obce.');
    for (const polygon of geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates) {
      const rings = polygon.map(ring => Float64Array.from(ring.flat()));
      let west = Infinity, east = -Infinity, north = -Infinity, south = Infinity;
      for (let i=0; i<rings[0].length; i+=2) {
        const x = rings[0][i], y = rings[0][i+1];
        west = Math.min(west,x); east = Math.max(east,x); south = Math.min(south,y); north = Math.max(north,y);
      }
      const shape = { id, west, east, south, north, rings };
      for (let x=cell(west); x<=cell(east); x++) for (let y=cell(south); y<=cell(north); y++) {
        const k = key(x,y);
        if (!grid.has(k)) grid.set(k,[]);
        grid.get(k).push(shape);
      }
    }
  }
  function locate(x,y) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    const ids = new Set();
    const scaleX = 111320 * Math.cos(y * Math.PI / 180);
    for (const shape of grid.get(key(cell(x),cell(y))) ?? []) {
      if (x<shape.west || x>shape.east || y<shape.south || y>shape.north) continue;
      let inside = false;
      for (const ring of shape.rings) {
        for (let i=2; i<ring.length; i+=2) {
          const ax = ring[i-2], ay = ring[i-1], bx = ring[i], by = ring[i+1];
          if ((ay>y) !== (by>y) && x < ax + (bx-ax)*(y-ay)/(by-ay)) inside = !inside;
          const dx=(bx-ax)*scaleX, dy=(by-ay)*111320, px=(x-ax)*scaleX, py=(y-ay)*111320;
          const t=Math.max(0,Math.min(1,(px*dx+py*dy)/(dx*dx+dy*dy || 1)));
          if ((px-t*dx)**2 + (py-t*dy)**2 < 100**2) return null;
        }
      }
      if (inside) ids.add(shape.id);
    }
    return ids.size === 1 ? [...ids][0] : null;
  }
  return {add,locate};
}

export async function germanBoundaries() {
  const year = new Date().getUTCFullYear();
  const directory = join(workDir,'registry','vg250-' + year);
  await mkdir(directory,{recursive:true});
  const index = municipalBoundaryIndex();
  const ids = new Set();
  let total;
  for (let offset=0; total === undefined || offset<total;) {
    const file = join(directory, offset + '.json');
    let page, downloaded = false;
    try { page = JSON.parse(await readFile(file,'utf8')); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      const url = new URL('https://sgx.geodatenzentrum.de/wfs_vg250');
      url.search = new URLSearchParams({ service:'WFS', version:'2.0.0', request:'GetFeature', typeNames:'vg250_gem',
        outputFormat:'application/json', srsName:'urn:ogc:def:crs:OGC:1.3:CRS84', sortBy:'objid',
        count:'500', startIndex:String(offset) });
      const response = await fetch(url,{signal:AbortSignal.timeout(90000)});
      if (!response.ok) throw new Error('BKG HTTP ' + response.status);
      page = await response.json();
      downloaded = true;
    }
    const count = Number(page.numberMatched);
    if (!Number.isSafeInteger(count) || count<10000 || (total !== undefined && count!==total) || !page.features?.length)
      throw new Error('Neúplná sada hranic BKG.');
    total = count;
    for (const {properties,geometry} of page.features) {
      if (ids.has(properties.objid) || !/^\d{8}$/.test(properties.ags)) throw new Error('Neplatná nebo opakovaná obec BKG.');
      ids.add(properties.objid);
      index.add(properties.ags,geometry);
    }
    if (downloaded) {
      const temp = file + '.' + randomUUID();
      await writeFile(temp,JSON.stringify(page));
      await rename(temp,file);
    }
    offset += page.features.length;
  }
  if (ids.size !== total) throw new Error('Neúplná sada hranic BKG.');
  return {...index, year};
}

if (import.meta.main) {
  await germanBoundaries();
  console.log('Hranice obcí BKG jsou připravené.');
}
