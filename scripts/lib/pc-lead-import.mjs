import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
export function hasPairedDevice() {
  return process.platform === 'win32' && Boolean(process.env.LOCALAPPDATA) &&
    existsSync(join(process.env.LOCALAPPDATA, 'Atmosferi', 'lead-import', 'device.xml'));
}

export async function openDeviceImporter() {
  const { stdout } = await run('powershell.exe', ['-NoLogo','-NoProfile','-NonInteractive','-Command',
    "$ErrorActionPreference='Stop'; $p=Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'Atmosferi/lead-import/device.xml'; [Net.NetworkCredential]::new('',(Import-Clixml -LiteralPath $p)).Password"],
  { windowsHide: true, timeout: 15000 });
  const key = stdout.trim();
  if (!/^[0-9a-f]{64}$/.test(key)) throw new Error('Neplatné spárování importu.');
  const config = await readFile(new URL('../../admin/src/integrations/supabase/client.ts', import.meta.url), 'utf8');
  const apiKey = config.match(/const SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)?.[1];
  // Bind the device key to its intended project, independently of editable input rows.
  const endpoint = 'https://paryiowezqlnffanxtnt.supabase.co/rest/v1/rpc/submit_pc_lead_review';
  if (!apiKey) throw new Error('Chybí veřejný klíč importu.');
  return async items => {
    const response = await fetch(endpoint, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30000),
      headers: { apikey: apiKey, 'Content-Type': 'application/json', 'x-atmosferi-import': key }, body: JSON.stringify({ items }) });
    if (!response.ok) throw new Error(`Import kontaktů HTTP ${response.status}.`);
    const result = await response.json();
    if (result.received !== items.length || !Number.isInteger(result.inserted) || result.inserted < 0 || result.inserted > items.length)
      throw new Error('Nepotvrzená dávka importu.');
    return result.inserted;
  };
}
