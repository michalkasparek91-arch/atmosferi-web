import {
  inspectionQueue, normalizeToKnownCanonical, rotateInContiguousGroups
} from "./inspection-queue.mjs";

const ORIGIN = "https://www.atmosferi.com";
const equal = (a, b) => {
  if (JSON.stringify(a) !== JSON.stringify(b))
    throw new Error("Unexpected: " + JSON.stringify(a) + " expected " + JSON.stringify(b));
};
const assert = (value, message) => { if (!value) throw new Error(message); };
const clock = slot => new Date(slot * 6 * 60 * 60 * 1000);

Deno.test("Search Analytics apex, query, fragment and legacy URL resolve only to existing canonicals", () => {
  const known = new Set([
    ORIGIN+"/", ORIGIN+"/guides", ORIGIN+"/studio.html",
    ORIGIN+"/interactive-floor-plan-design-real-estate.html",
    ORIGIN+"/for-agencies"
  ]);
  equal(normalizeToKnownCanonical("http://atmosferi.com/studio.html?utm_medium=seo",known),ORIGIN+"/studio.html");
  equal(normalizeToKnownCanonical("https://atmosferi.com/?lang=cs#header",known),ORIGIN+"/");
  equal(normalizeToKnownCanonical("https://www.atmosferi.com/index.html",known),ORIGIN+"/");
  equal(normalizeToKnownCanonical("https://www.atmosferi.com/guides.html",known),ORIGIN+"/guides");
  equal(normalizeToKnownCanonical("https://atmosferi.com/for-agencies/",known),ORIGIN+"/for-agencies");
  equal(normalizeToKnownCanonical("https://www.atmosferi.com/missing.html",known),null);
  equal(normalizeToKnownCanonical("https://atmosferi.com.evil.example/studio.html",known),null);
  equal(normalizeToKnownCanonical("javascript:alert(1)",known),null);
  equal(normalizeToKnownCanonical("https://user:password@atmosferi.com/studio.html",known),null);
});

Deno.test("contiguous batch groups are disjoint, bounded, and visit even awkward archive lengths", () => {
  for (const count of [1, 5, 16, 17, 30, 31, 72, 137, 150]) {
    const items = Array.from({length:count},(_,i)=>i);
    const groups = Math.ceil(count/16);
    const seen = [];
    for(let slot=0;slot<groups;slot++){
      const batch=rotateInContiguousGroups(items,slot,16);
      assert(batch.length<=16,"exceeded group size");
      seen.push(...batch);
    }
    equal(seen,items);
    equal(rotateInContiguousGroups(items,groups,16),rotateInContiguousGroups(items,0,16));
  }
});

Deno.test("all canonical articles and services are sampled across a full cycle with high-impression public pages", () => {
  const articles=Array.from({length:137},(_,i)=>({url:ORIGIN+"/article-"+String(i).padStart(3,"0")+".html",date:"2026-11-21"}));
  const services=Array.from({length:19},(_,i)=>ORIGIN+"/service-"+String(i).padStart(3,"0")+".html");
  const mainService=ORIGIN+"/interactive-floor-plan-design-real-estate.html";
  services.push(mainService);
  const canonicalUrls=[ORIGIN+"/",ORIGIN+"/guides",ORIGIN+"/studio.html",ORIGIN+"/pricing.html",
    ...articles.map(x=>x.url),...services];
  const popular=[
    {keys:["https://atmosferi.com/?lang=cs"],impressions:30},
    {keys:["http://atmosferi.com/studio.html?utm_source=google"],impressions:14},
    {keys:[articles[45].url],impressions:316},
    {keys:["https://www.atmosferi.com/pricing.html"],impressions:12},
    {keys:["https://evil.example/exploit.html"],impressions:500000}
  ];
  const all=new Set();
  const runs=20;
  for (let slot=0;slot<runs;slot++) {
    const current=inspectionQueue(clock(slot),articles,services,canonicalUrls,popular);
    assert(current.length<=32,"Exceeded the private GSC report validation limit");
    assert(current.length===new Set(current).size,"Duplicate URL");
    assert(current.every(x=>canonicalUrls.includes(x)),"Unpublished URL");
    for(const pinned of [ORIGIN+"/",ORIGIN+"/guides",mainService,ORIGIN+"/studio.html",
      ORIGIN+"/pricing.html",articles[45].url]){
      assert(current.includes(pinned),"Lost a canonical high-intent page: "+pinned);
    }
    current.forEach(x=>all.add(x));
  }
  for(const url of articles.map(x=>x.url).concat(services))assert(all.has(url),"Archive missed: "+url);
});

Deno.test("published aliases share one slot, and untrusted Google result domains are excluded", () => {
  const main=ORIGIN+"/interactive-floor-plan-design-real-estate.html";
  const homepage=ORIGIN+"/";
  const guides=ORIGIN+"/guides";
  const studio=ORIGIN+"/studio.html";
  const urls=[homepage,guides,main,studio];
  const queue=inspectionQueue(clock(9),[],[main],urls,[
    {keys:["http://atmosferi.com/"],impressions:30},
    {keys:["https://www.atmosferi.com/?lang=cs"],impressions:10},
    {keys:["https://www.atmosferi.com/index.html"],impressions:2},
    {keys:["https://www.atmosferi.com/studio.html"],impressions:14},
    {keys:["https://atmosferi.com.attacker.example/studio.html"],impressions:5000}
  ]);
  equal(queue,[homepage,guides,main,studio]);
});
