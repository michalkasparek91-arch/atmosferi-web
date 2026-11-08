import {hasEmailEvidence, publicWebsite, verifyRecipientWebsite} from './recipient-evidence.ts';
const assert=(value:unknown)=>{if(!value) throw new Error('Assertion failed');};
Deno.test('large script data without an address does not backtrack',()=>{
 const html='<script>'+ 'a'.repeat(500000)+'</script>';
 assert(!hasEmailEvidence(html,'info@studio.ch'));
 assert(hasEmailEvidence(html+'<a href="mailto:info@studio.ch">Email</a>','info@studio.ch'));
});
Deno.test('exact address evidence, entities and case',()=>{
 assert(hasEmailEvidence('<a href="mailto:Info&#64;Studio.ch">Email</a>','info@studio.ch'));
 assert(!hasEmailEvidence('otherinfo@studio.ch info@studio.ch.example.com','info@studio.ch'));
});
Deno.test('reject private URL forms and credentials',()=>{
 for(const url of ['http://127.0.0.1','http://[::1]','http://localhost','file:///etc/passwd','https://user:pass@studio.ch','http://studio.local','http://studio.ch:8080']) {
   let rejected=false;try{publicWebsite(url);}catch{rejected=true;}assert(rejected);
 }
 assert(publicWebsite('https://www.studio.ch/contact').hostname==='www.studio.ch');
});
Deno.test('evidence on contact page; no address transmitted',async()=>{
 const original=globalThis.fetch; const requests:string[]=[];
 globalThis.fetch=(async(input:RequestInfo|URL)=>{
   const url=String(input);requests.push(url);
   if(url.includes('dns.google')) return Response.json({Answer:url.includes('type=A&')?[]:[{type:1,data:'93.184.216.34'}]});
   return new Response(url.endsWith('/contact')?'info@studio.ch':'<a href="/contact">Contact</a>',{headers:{'Content-Type':'text/html'}});
 }) as typeof fetch;
 try{assert((await verifyRecipientWebsite('info@studio.ch','https://studio.ch/')).status==='verified');assert(requests.every(u=>!u.includes('info@')));}finally{globalThis.fetch=original;}
});
Deno.test('private DNS target and unavailable site cannot pass',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=(async()=>Response.json({Answer:[{type:1,data:'10.0.0.1'}]})) as typeof fetch;
 try{assert((await verifyRecipientWebsite('info@studio.ch','https://studio.ch')).status==='unknown');}finally{globalThis.fetch=original;}
});
Deno.test('missing address is not a verified mailbox',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=(async(input:RequestInfo|URL)=>String(input).includes('dns.google')?Response.json({Answer:[{type:1,data:'93.184.216.34'}]}):new Response('other@studio.ch',{headers:{'Content-Type':'text/html'}})) as typeof fetch;
 try{assert((await verifyRecipientWebsite('info@studio.ch','https://studio.ch')).status==='not_found');}finally{globalThis.fetch=original;}
});
