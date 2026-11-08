// Public company pages only; no AI service and no email address in outgoing URLs.
export function hasEmailEvidence(html: string, email: string): boolean {
  const decoded = html.replace(/&#(x[0-9a-f]+|[0-9]+);?/gi, (_, n) =>
    String.fromCodePoint(n[0].toLowerCase() === 'x' ? parseInt(n.slice(1),16) : Number(n)))
    .replace(/&commat;/gi,'@').replace(/&period;/gi,'.').replace(/&amp;/gi,'&');
  // Search only for the known address. Extracting every address with a greedy
  // regex can consume the worker CPU limit on long scripts/base64 without '@'.
  const text=decoded.toLowerCase(), needle=email.trim().toLowerCase();
  if(!needle || !needle.includes('@')) return false;
  for(let at=text.indexOf(needle);at!==-1;at=text.indexOf(needle,at+needle.length)) {
    const before=at>0?text[at-1]:'',after=text[at+needle.length] || '';
    if(!/[a-z0-9.!#$%&'*+/=?^_`{|}~-]/i.test(before) && !/[a-z0-9.-]/i.test(after)) return true;
  }
  return false;
}

export function publicWebsite(url: string): URL {
  const u = new URL(url);
  if (!['http:','https:'].includes(u.protocol) || u.username || u.password || (u.port && !['80','443'].includes(u.port))
    || !/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(u.hostname) || /^[\d.]+$/.test(u.hostname)
    || /\.(local|internal|localhost|test|invalid)$/i.test(u.hostname)) throw new Error('Non-public website');
  u.hash=''; return u;
}

async function publicDns(host: string, signal: AbortSignal) {
  for (const type of ['A','AAAA']) {
    const r = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(host)}&type=${type}`, {signal:AbortSignal.any([signal,AbortSignal.timeout(3000)])});
    if(!r.ok) throw new Error('DNS unavailable');
    const data=await r.json();
    for(const answer of data.Answer || []) {
      if(answer.type===1 && /^(0\.|10\.|127\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|198\.(18|19)\.)/.test(answer.data)) throw new Error('Private address');
      if(answer.type===28 && !/^2[0-9a-f]{3}:/i.test(answer.data)) throw new Error('Non-global IPv6');
    }
  }
}

export async function verifyRecipientWebsite(email: string, website: string): Promise<{status:'verified'|'not_found'|'unknown';url:string|null}> {
  try {
    const signal=AbortSignal.timeout(8000);
    const first=publicWebsite(website); await publicDns(first.hostname,signal);
    const allowed=(u: URL) => u.hostname.replace(/^www\./,'') === first.hostname.replace(/^www\./,'');
    const load=async (initial: URL) => {
      let url=initial;
      for(let redirects=0;redirects<3;redirects++) {
        publicWebsite(url.href); if(!allowed(url)) throw new Error('External redirect');
        const r=await fetch(url,{redirect:'manual',signal:AbortSignal.any([signal,AbortSignal.timeout(4000)]),headers:{'User-Agent':'Atmosferi contact verification'}});
        if(r.status>=300 && r.status<400 && r.headers.get('location')) { await r.body?.cancel();url=publicWebsite(new URL(r.headers.get('location')!,url).href);await publicDns(url.hostname,signal);continue; }
        if(!r.ok || !r.headers.get('content-type')?.includes('text/html')) {await r.body?.cancel();throw new Error('Website unavailable');}
        const reader=r.body!.getReader(); let text='',size=0;const decoder=new TextDecoder();
        try {while(size<500000) {const part=await reader.read();if(part.done) break;size+=part.value.length;text+=decoder.decode(part.value,{stream:true});}} finally {await reader.cancel();}
        return {html:text,url};
      }
      throw new Error('Redirect limit');
    };
    const home=await load(first);
    if(hasEmailEvidence(home.html,email)) return {status:'verified',url:home.url.href};
    const links=[...home.html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)].map(m=>m[1]);
    const contacts=[...new Set(links.filter(l=>/contact|kontakt|impressum|about/i.test(l)))].slice(0,3);
    let unavailable=false;
    for(const link of contacts) {
      try {const u=publicWebsite(new URL(link,home.url).href);if(!allowed(u)) continue;const page=await load(u);if(hasEmailEvidence(page.html,email)) return {status:'verified',url:page.url.href};} catch {unavailable=true;}
    }
    return {status:unavailable?'unknown':'not_found',url:home.url.href};
  } catch {return {status:'unknown',url:null};}
}
