/* ==========================================================================
   ATMOSFERI — pricing.js
   The estimate composer. A base engagement plus optional visualisation
   modules; the running total is drawn as a stack of ink blocks sized to
   each line's share of the figure. Indicative only — fixed on brief.
   ========================================================================== */
(function () {
  'use strict';

  var EUR = function (n) { return '€' + n.toLocaleString('en-US'); };

  /* ---- Data --------------------------------------------------------- */
  var BASES = {
    portfolio: { name: 'Portfolio', price: 6000,  hint: 'Up to 6 pages · light CMS · visualisation à la carte' },
    practice:  { name: 'Practice',  price: 14000, hint: 'Design system · full CMS · one visualisation module included' },
    launch:    { name: 'Launch',    price: 30000, hint: 'Sales platform · CRM · the full visualisation suite included' }
  };

  // Visualisation modules, in escalating scope.
  var MODULES = [
    { id: 'still',  name: 'Hero render — still',     price: 2500,  desc: 'One large-format architectural still' },
    { id: 'flythr', name: 'Animated fly-through',    price: 6000,  desc: 'Cinematic camera move · ~30s' },
    { id: 'model',  name: 'Interactive 3D model',    price: 8000,  desc: 'Orbit · section · explore in browser' },
    { id: 'stack',  name: 'Floor-stack explorer',    price: 9000,  desc: 'Navigable unit / availability stack' },
    { id: 'webgl',  name: 'Real-time WebGL scene',   price: 12000, desc: 'Live-lit, navigable spatial scene' }
  ];

  // Which modules each base bundles in (locked-on, no extra charge).
  var INCLUDED = {
    portfolio: [],
    practice:  ['still'],
    launch:    ['still', 'flythr', 'model', 'stack', 'webgl']
  };

  /* ---- State -------------------------------------------------------- */
  var state = {
    base: 'practice',
    // selected = user-chosen optional modules (excludes included ones)
    selected: {}
  };

  /* ---- Elements ----------------------------------------------------- */
  var segEl     = document.getElementById('seg-base');
  var hintEl    = document.getElementById('base-hint');
  var modsEl    = document.getElementById('mods');
  var stackEl   = document.getElementById('stack');
  var totalEl   = document.getElementById('total');
  var countEl   = document.getElementById('mod-count');

  if (!segEl || !modsEl || !stackEl) return; // not the pricing page

  function isIncluded(id) { return INCLUDED[state.base].indexOf(id) !== -1; }

  function activeModules() {
    // Returns module objects that are part of the estimate (included or selected).
    return MODULES.filter(function (m) { return isIncluded(m.id) || state.selected[m.id]; });
  }

  function total() {
    var t = BASES[state.base].price;
    MODULES.forEach(function (m) {
      if (!isIncluded(m.id) && state.selected[m.id]) t += m.price;
    });
    return t;
  }

  /* ---- Render: base segmented control ------------------------------- */
  function renderSeg() {
    var btns = segEl.querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) {
      var on = btns[i].getAttribute('data-base') === state.base;
      btns[i].setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    if (hintEl) hintEl.textContent = BASES[state.base].hint;
  }

  /* ---- Render: module toggle rows ----------------------------------- */
  function renderMods() {
    modsEl.innerHTML = '';
    MODULES.forEach(function (m) {
      var included = isIncluded(m.id);
      var on = included || !!state.selected[m.id];

      var row = document.createElement('button');
      row.type = 'button';
      row.className = 'mod';
      row.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (included) row.setAttribute('data-locked', 'true');

      var box = document.createElement('span');
      box.className = 'mod__box';

      var body = document.createElement('span');
      body.className = 'mod__body';
      var nm = document.createElement('span');
      nm.className = 'mod__name';
      nm.textContent = m.name;
      var ds = document.createElement('span');
      ds.className = 'mod__desc';
      ds.textContent = m.desc;
      body.appendChild(nm);
      body.appendChild(ds);

      var price = document.createElement('span');
      if (included) {
        price.className = 'mod__incl';
        price.textContent = 'Included';
      } else {
        price.className = 'mod__price';
        price.textContent = '+ ' + EUR(m.price);
      }

      row.appendChild(box);
      row.appendChild(body);
      row.appendChild(price);

      if (!included) {
        row.addEventListener('click', function () {
          state.selected[m.id] = !state.selected[m.id];
          render();
        });
      }
      modsEl.appendChild(row);
    });
  }

  /* ---- Render: the block stack -------------------------------------- */
  function renderStack(animateIds) {
    var rows = [{ name: BASES[state.base].name, val: BASES[state.base].price, base: true, id: '__base' }];
    activeModules().forEach(function (m) {
      rows.push({ name: m.name, val: m.price, base: false, id: m.id });
    });

    var sum = rows.reduce(function (a, r) { return a + r.val; }, 0);

    stackEl.innerHTML = '';
    rows.forEach(function (r) {
      var blk = document.createElement('div');
      blk.className = 'blk ' + (r.base ? 'blk--base' : 'blk--mod');
      // Proportional height, with a floor so labels stay legible.
      blk.style.flexGrow = String(Math.max(r.val / sum, 0.06));

      var rowEl = document.createElement('span');
      rowEl.className = 'blk__row';
      var nm = document.createElement('span');
      nm.className = 'blk__name';
      nm.textContent = r.name;
      var vl = document.createElement('span');
      vl.className = 'blk__val';
      vl.textContent = EUR(r.val);
      rowEl.appendChild(nm);
      rowEl.appendChild(vl);
      blk.appendChild(rowEl);

      stackEl.appendChild(blk);

      if (animateIds && animateIds.indexOf(r.id) !== -1) {
        blk.classList.add('blk--enter');
        requestAnimationFrame(function () {
          requestAnimationFrame(function () { blk.classList.remove('blk--enter'); });
        });
      }
    });
  }

  /* ---- Render: totals ----------------------------------------------- */
  function renderTotals() {
    if (totalEl) totalEl.textContent = EUR(total());
    if (countEl) {
      var n = activeModules().length;
      countEl.textContent = n + (n === 1 ? ' module' : ' modules');
    }
  }

  var prevActive = [];
  function render() {
    var nowActive = activeModules().map(function (m) { return m.id; });
    var entering = nowActive.filter(function (id) { return prevActive.indexOf(id) === -1; });
    prevActive = nowActive;

    renderSeg();
    renderMods();
    renderStack(entering);
    renderTotals();
  }

  /* ---- Wire base control -------------------------------------------- */
  segEl.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-base]');
    if (!btn) return;
    state.base = btn.getAttribute('data-base');
    // Selecting a base resets optional picks (included set changes).
    state.selected = {};
    prevActive = []; // animate the new included set in
    render();
  });

  render();
})();
