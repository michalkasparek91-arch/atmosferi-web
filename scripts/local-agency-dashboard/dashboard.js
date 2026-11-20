const select = (id) => document.getElementById(id);
const number = new Intl.NumberFormat('cs-CZ');
const dates = new Intl.DateTimeFormat('cs-CZ', { dateStyle: 'short', timeStyle: 'short' });
const words = { pending: 'Čeká', running: 'Probíhá', done: 'Prohledáno', retry: 'Zkusí se znovu', disabled: 'Pozastaveno' };
const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const stamp = (value) => value ? dates.format(new Date(value)) : '—';
const chip = (status, label = words[status]) => `<span class="chip ${escape(status)}">${escape(label)}</span>`;
const amount = (value) => number.format(value || 0);
let page = 0;
let plan;
let requestVersion = 0;
let debounce;
let mutation = false;

async function api(path, body) {
  const response = await fetch(path, body ? {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  } : undefined);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

function notify(message, error = false) {
  const notice = select('notice');
  notice.textContent = message;
  notice.hidden = !message;
  notice.classList.toggle('error', error);
}

function renderPlan(data) {
  plan = data;
  const { counts, registry } = data;
  if (registry) {
    select('registry').innerHTML = `Německo · ${amount(registry.count)} obcí · <a href="https://www.destatis.de/DE/Themen/Laender-Regionen/Regionales/Gemeindeverzeichnis/_inhalt.html" target="_blank" rel="noopener noreferrer">Destatis</a> ${escape(registry.date)}`;
  } else select('registry').textContent = 'Čeká se na načtení registru obcí.';
  select('pause').disabled = !registry;
  select('pause').textContent = data.paused ? 'Obnovit sběr' : 'Pozastavit sběr';
  select('kinds').disabled = !registry;
  for (const checkbox of select('kinds').querySelectorAll('input')) checkbox.checked = data.kinds.includes(checkbox.value);
  select('covered').textContent = `${amount(counts.done)} / ${amount(counts.municipalities)}`;
  select('queries').textContent = `${amount(counts.searches_done)} / ${amount(counts.queries)}`;
  select('running').textContent = amount(counts.running);
  const countryFilter = select('land');
  if (countryFilter.options.length === 1) {
    for (const land of data.states) countryFilter.add(new Option(land, land));
  }
  const matched = data.rows[0]?.matched ?? 0;
  select('matched').textContent = `${amount(matched)} obcí`;
  select('municipalities').innerHTML = data.rows.length ? data.rows.map((row) => {
    const status = !row.enabled ? 'disabled' : row.running ? 'running' : row.retry ? 'retry' : row.done === row.total ? 'done' : 'pending';
    const area = [row.district !== row.name ? row.district : '', row.land, row.ags].filter(Boolean).join(' · ');
    return `<tr><td><strong>${escape(row.name)}</strong><small>${escape(area)}</small></td>
      <td>${chip(status)}</td><td>${amount(row.done)} / ${amount(row.total)}</td><td>${amount(row.contacts)}</td>
      <td>${escape(stamp(row.last))}</td><td><div class="row-buttons" data-ags="${escape(row.ags)}">
      <button class="button secondary" type="button" data-action="priority" aria-pressed="${Boolean(row.priority)}">${row.priority ? 'Odebrat prioritu' : 'Přednostně'}</button>
      <button class="button secondary" type="button" data-action="enabled" aria-pressed="${Boolean(row.enabled)}">${row.enabled ? 'Pozastavit' : 'Povolit'}</button>
      <button class="button secondary" type="button" data-action="rescan" ${row.running ? 'disabled' : ''}>Znovu</button></div></td></tr>`;
  }).join('') : '<tr><td colspan="6">Žádné obce pro tento filtr.</td></tr>';
  select('page').textContent = `${page + 1} / ${Math.max(1, Math.ceil(matched / 25))}`;
  select('previous').disabled = page === 0;
  select('next').disabled = (page + 1) * 25 >= matched;
  select('activity').innerHTML = data.activity.map((job) => `<li><strong>${escape(job.name)}</strong> · ${escape(job.term)} ${chip(job.status, job.status === 'pending' && job.more_pages ? 'Čeká na další stranu' : undefined)}
    <small>${escape(stamp(job.started))} · ${amount(job.pages)} stran výsledků · ${amount(job.matches)} webů ve výsledcích · ${amount(job.fetched)} načtených · ${amount(job.contacts)} kontaktů</small>
    ${job.error ? `<small>${escape(job.error)}</small>` : ''}</li>`).join('') || '<li>Zatím žádné dotazy.</li>';
}

function renderImports(data, exports) {
  select('waiting').textContent = amount(data.pending);
  select('processed').textContent = `Zpracovaných dávek: ${amount(data.imported)}`;
  const container = select('imports');
  const opened = new Set([...container.querySelectorAll('details[open]')].map((entry) => entry.dataset.batch));
  container.innerHTML = data.recent.map((batch) => `<details data-batch="${escape(batch.name)}" ${opened.has(batch.name) ? 'open' : ''}>
    <summary>${escape(stamp(batch.at))} · ${amount(batch.count)} kontaktů ${chip(batch.status, batch.status === 'pending' ? 'Čeká na import' : 'Zpracováno')}</summary>
    <ul class="items">${batch.companies.map((entry) => `<li>${escape(entry.company)}<small>${escape([entry.category, entry.specialty, entry.city, entry.website].filter(Boolean).join(' · '))}</small></li>`).join('')}</ul>
    </details>`).join('') || '<p>Fronta je prázdná.</p>';
  select('exports').innerHTML = exports.map((name) => `<li><a href="/download/${encodeURIComponent(name)}" download>${escape(name)}</a></li>`).join('') || '<li>Zatím bez exportů.</li>';
}

async function refresh() {
  const version = ++requestVersion;
  const filters = new URLSearchParams({ page, query: select('query').value, land: select('land').value, status: select('status').value });
  try {
    const [data, imports, exports] = await Promise.all([api(`/api/plan?${filters}`), api('/api/imports'), api('/api/exports')]);
    if (version !== requestVersion) return;
    renderPlan(data);
    renderImports(imports, exports);
    if (select('notice').classList.contains('error')) notify('');
  } catch (error) {
    if (version === requestVersion) notify(error.message, true);
  }
}

async function change(path, body, confirmation) {
  if (mutation) return;
  mutation = true;
  try { await api(path, body); await refresh(); notify(confirmation); }
  catch (error) { notify(error.message, true); }
  finally { mutation = false; }
}

select('pause').addEventListener('click', () => void change('/api/control', { paused: !plan.paused }, plan.paused ? 'Sběr pokračuje.' : 'Sběr se zastaví po dokončení právě běžící dávky.'));
select('kinds').addEventListener('change', (event) => {
  const selected = [...select('kinds').querySelectorAll('input:checked')].map((checkbox) => checkbox.value);
  if (selected.length) void change('/api/control', { kinds: selected }, 'Rozsah sběru uložen.');
  else { event.target.checked = true; notify('Vyber alespoň jeden obor. Pro zastavení použij Pozastavit sběr.', true); }
});
select('municipalities').addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const row = button.closest('[data-ags]');
  const action = button.dataset.action;
  const payload = { [action]: action === 'rescan' || button.getAttribute('aria-pressed') !== 'true' };
  void change(`/api/municipalities/${row.dataset.ags}`, payload, 'Plán obce uložen.');
});
select('query').addEventListener('input', () => { page = 0; clearTimeout(debounce); debounce = setTimeout(refresh, 180); });
for (const id of ['land', 'status']) select(id).addEventListener('change', () => { page = 0; void refresh(); });
select('previous').addEventListener('click', () => { if (page > 0) page--; void refresh(); });
select('next').addEventListener('click', () => { page++; void refresh(); });
void refresh();
setInterval(() => { if (!mutation && !document.hidden) void refresh(); }, 12_000);
