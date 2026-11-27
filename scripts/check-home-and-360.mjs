import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const pano = fs.readFileSync("assets/pano-f.js", "utf8");
const css = fs.readFileSync("assets/films-f.css", "utf8");
const films = fs.readFileSync("films.html", "utf8");
const home = fs.readFileSync("index.html", "utf8");
const homeCss = fs.readFileSync("assets/home-f.css", "utf8");
assert(homeCss.includes("h-viewport-overflow-guard"), "Homepage must explicitly control horizontal overflow");
assert(homeCss.includes("html:has(> body.h) { overflow-x: clip; }"), "Viewport document must not horizontally scroll");
assert(homeCss.includes("body.h { max-width: 100%; overflow-x: clip; }"), "Homepage must clip wide descendants without scroll container");
assert(homeCss.includes(".h .h-railwrap, .h .h-rail { min-width: 0; max-width: 100%; }"), "Website carousel track must fit the page");
assert(homeCss.includes(".h .f-footer__mark { max-width: 100%; overflow: clip; }"), "Large footer wordmark must not cause page overflow");
assert(homeCss.includes(".h-rail { display: grid;") && homeCss.includes("overflow-x: auto;"), "Nested website carousel must stay horizontally scrollable");
assert(/href="assets\/home-f\.css\?v=[a-z0-9._-]+"/i.test(home), "Homepage must reference a versioned CSS file");
const agencyCss = fs.readFileSync("assets/for-agencies.css", "utf8");
const agency = fs.readFileSync("for-agencies.html", "utf8");
assert(agencyCss.includes('object-position: center 25%; filter: grayscale(.2);'), "Agency portrait must be 20% desaturated");
assert(agencyCss.includes('.f-team__card:hover img { filter: grayscale(0);'), "Agency portrait must be full color on hover");
const agencyStylesheet = agency.match(/<link[^>]+href=["']\/assets\/for-agencies\.css\?v=([a-z0-9._-]+)["']/i);
assert(agencyStylesheet && agencyStylesheet[1], "Agency must load its existing versioned stylesheet");


assert(pano.includes("inViewport = entry.isIntersecting && entry.intersectionRatio >= 0.15"));
assert(pano.includes("(engaged || inViewport) && autoOn && !busy"));
assert(pano.includes('if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;'));
assert(css.includes(".v-tour:not(.is-active):not(.fs) { touch-action: pan-y;"));
assert(css.includes(".v-tour.is-active, .v-tour.fs, .v-tour:fullscreen { touch-action: none; }"));
assert(/src="assets\/pano-f\.js\?v=[a-z0-9._-]+"/i.test(films), "Films page must reference a versioned panorama script");
assert(/href="assets\/films-f\.css\?v=[a-z0-9._-]+"/i.test(films), "Films page must reference a versioned stylesheet");
const footer = home.slice(home.indexOf('<footer class="f-footer">'));
assert(!footer.includes('<p class="f-brand">'), "Remove only the small footer logo");
assert(footer.includes('f-footer__mark') && footer.includes('f-footer__mail'));
assert(footer.includes('data-footer-agencies') && footer.includes('data-footer-guides-nav'), 'Localized footer hooks must exist');
for (const lang of ['en','cs','de','nb']) assert(footer.includes('data-footer-seo-lang="'+lang+'"'), 'Keep indexed service link for '+lang);
const i18n = fs.readFileSync('assets/i18n.js', 'utf8');
assert(i18n.includes('syncHomepageFooter(lang);'), 'Language switching must update homepage footer');
for (const label of ['For agencies','Pro agentury','Für Agenturen','Pour les agences']) assert(i18n.includes(label), 'Missing agency translation '+label);
assert(footer.includes('/guides?lang=en'), 'Guides link must preserve language');
assert(home.includes('<p class="f-brand">'), "Preserve the studio logo");
assert(homeCss.includes("filter: grayscale(.2);"));
assert(homeCss.includes(".h .f-team__card:hover img { filter: grayscale(0); }"));
// Homepage asset cache query is checked above.

// Minimal event-driven WebGL mock that runs the real panorama script.
const nodes = new Map();
class Classes {
  constructor(){this.s=new Set();}
  add(...v){v.forEach(x=>this.s.add(x));}
  remove(...v){v.forEach(x=>this.s.delete(x));}
  toggle(v,b){if(b===undefined)b=!this.s.has(v);b?this.s.add(v):this.s.delete(v);return b;}
  contains(v){return this.s.has(v);}
}
function el(id){
  const x={
    id,style:{},dataset:{},hidden:false,innerHTML:"",textContent:"",
    clientWidth:800,clientHeight:600,events:{},classList:new Classes(),
    addEventListener(t,f){(this.events[t]??=[]).push(f);},
    fire(t,e={}){for(const f of this.events[t]??[])f({pointerId:1,clientX:100,clientY:100,pointerType:"mouse",...e});},
    appendChild(){},setAttribute(){},focus(){},setPointerCapture(){},
    parentNode:{clientWidth:200}
  };nodes.set(id,x);return x;
}
["tour","tourCanvas","tourGate","tourStart","tourExit","tourName","tourMarkers",
"tourFade","tourLoad","tourStrip","tourRail","tourInfo","tourInfoT","tourInfoP",
"tourAuto","tourFs"].forEach(el);
const doc={
  documentElement:{lang:"en"},fullscreenElement:null,events:{},
  getElementById(k){return nodes.get(k)||null;},
  createElement(){return el("new"+nodes.size);},
  addEventListener(k,f){(this.events[k]??=[]).push(f);}
};
const win={devicePixelRatio:1,events:{},matchMedia(){return {matches:false};},
  addEventListener(k,f){(this.events[k]??=[]).push(f);}};
let callbacks=[],observer,renderCount=0,lookCount=0;
class Vec {
  set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
  clone(){return this;}normalize(){return this;}dot(){return 1;}
  project(){return {x:0,y:0,z:0};}
}
const THREE={
 WebGLRenderer:class{setPixelRatio(){}setSize(){}render(){renderCount++;}},
 Scene:class{add(){}},PerspectiveCamera:class{constructor(){this.fov=75;}updateProjectionMatrix(){}lookAt(){lookCount++;}},
 SphereGeometry:class{scale(){}},MeshBasicMaterial:class{},Mesh:class{},
 TextureLoader:class{setCrossOrigin(){}load(_,f){f({});}},
 Vector3:Vec,MathUtils:{degToRad(v){return v*Math.PI/180;}},LinearFilter:1
};
const sandbox={
 window:win,document:doc,THREE,console,
 MutationObserver:class{observe(){}},
 IntersectionObserver:class{constructor(fn){observer=fn;}observe(){}},
 requestAnimationFrame(fn){callbacks.push(fn);},
 setTimeout(){return 1;},clearTimeout(){}
};
win.IntersectionObserver=sandbox.IntersectionObserver;
vm.runInNewContext(pano,sandbox);
function tick(n){for(let i=0;i<n;i++){const fn=callbacks.shift();assert(fn,"rAF callback missing");fn();}}
const first=renderCount;
tick(3);
assert.equal(renderCount,first,"Offscreen preview remains still");
observer([{target:nodes.get("tour"),isIntersecting:true,intersectionRatio:0.8}]);
tick(4);
assert(renderCount>first+1,"Visible preview moves without a start click");
nodes.get("tourCanvas").fire("pointerdown",{clientX:120});
assert(nodes.get("tour").classList.contains("is-active"),"Mouse drag engages tour");
const beforeDrag=lookCount;
win.events.pointermove[0]({pointerId:1,clientX:160,clientY:120});
tick(2);
assert(lookCount>beforeDrag,"Drag repaints panorama");
win.events.pointerup[0]({pointerId:1});
nodes.get("tourAuto").fire("click");
nodes.get("tourExit").fire("click");
const stopped=renderCount;
tick(4);
assert(renderCount<=stopped+1,"Paused preview avoids wasted rendering");
console.log("360° motion and homepage visuals regression tests passed.");
