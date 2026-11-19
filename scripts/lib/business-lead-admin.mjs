import { readFile } from 'node:fs/promises';
import { hostKey, websiteUrl } from './business-lead-web.mjs';

function websiteHost(value) {
  const site = value && (websiteUrl(value) || websiteUrl(`https://${value}`));
  return site ? hostKey(site) : null;
}

export async function openAdminImporter() {
  const config = await readFile(new URL('../../admin/src/integrations/supabase/client.ts', import.meta.url), 'utf8');
  const url = config.match(/const SUPABASE_URL\s*=\s*["'](https:\/\/[^"']+)["']/)?.[1];
  const apiKey = config.match(/const SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)?.[1];
  if (!url || !apiKey) throw new Error('V konfiguraci adminu chybí URL nebo veřejný klíč Supabase.');

  let token = process.env.LEAD_ADMIN_ACCESS_TOKEN;
  async function call(path, { body, headers } = {}) {
    const response = await fetch(new URL(path, url), {
      method: body === undefined ? 'GET' : 'POST', redirect: 'error', signal: AbortSignal.timeout(15000),
      headers: { apikey: apiKey, ...(token && { Authorization: `Bearer ${token}` }),
        ...(body !== undefined && { 'Content-Type': 'application/json' }), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`Supabase HTTP ${response.status} při volání ${path.split('?')[0]}.`);
    return response.json();
  }
  if (!token) {
    const { LEAD_ADMIN_EMAIL: email, LEAD_ADMIN_PASSWORD: password } = process.env;
    if (!email || !password) throw new Error('Přímý import vyžaduje přihlášení správce Atmosferi.');
    ({ access_token: token } = await call('/auth/v1/token?grant_type=password', { body: { email, password } }));
    if (!token) throw new Error('Supabase nevrátil přístupový token správce.');
  }
  const user = await call('/auth/v1/user');
  if (!user.id || !(await call('/rest/v1/rpc/is_admin', { body: { _user_id: user.id } }))) {
    throw new Error('Je vyžadován účet administrátora Atmosferi.');
  }

  const table = '/rest/v1/agency_outreach_leads';
  const existingEmails = new Set();
  const existingSites = new Set();
  const batchSize = 250;
  for (let offset = 0; ; offset += batchSize) {
    const existing = await call(`${table}?select=email,website&order=id&limit=${batchSize}&offset=${offset}`);
    for (const row of existing) {
      existingEmails.add(row.email?.trim().toLowerCase());
      const host = websiteHost(row.website);
      if (host) existingSites.add(host);
    }
    if (existing.length < batchSize) break;
  }

  return async (input) => {
    const rows = [];
    for (const { source_id, company_name, email, website, city, source_name, notes } of input) {
      const emailKey = email.trim().toLowerCase();
      const host = websiteHost(website);
      if (!host) throw new Error('Dávka obsahuje neplatnou adresu firemního webu.');
      if (existingEmails.has(emailKey) || existingSites.has(host)) continue;
      existingEmails.add(emailKey);
      existingSites.add(host);
      rows.push({ source_id, company_name, email: emailKey, website, city, source_name, notes,
        review_state: 'review', priority: 'REVIEW', outreach_status: 'new' });
    }
    let inserted = 0;
    for (let index = 0; index < rows.length; index += 50) {
      const chunk = rows.slice(index, index + 50);
      const saved = await call(`${table}?on_conflict=source_id&select=id`, {
        headers: { Prefer: 'resolution=ignore-duplicates,return=representation' }, body: chunk,
      });
      if (!Array.isArray(saved) || saved.length > chunk.length) throw new Error('Supabase vrátil neočekávaný výsledek importu.');
      inserted += saved.length;
    }
    return inserted;
  };
}
