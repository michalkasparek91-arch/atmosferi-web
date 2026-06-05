/* ============================================================
   ATMOSFERI° — Pricing composer
   Compose a base engagement + visualisation modules.
   The stack visualises VALUE delivered (block mass ∝ price);
   the total readout shows what you PAY. Modules that are
   bundled into the engagement render as ghost blocks (INCL)
   with full mass but zero cost — so you see the bundle.
   ============================================================ */
(function () {
  'use strict';

  var BASES = {
    portfolio: { label: 'Portfolio', price: 6000,  included: 0,
      hint: 'Visualisation priced per module.' },
    practice:  { label: 'Practice',  price: 14000, included: 1,
      hint: 'One module included — highest value, free.' },
    launch:    { label: 'Launch',    price: 30000, included: 'all',
      hint: 'Full visualisation suite — every module bundled in.' }
  };

  // Order matters: this is the stacking order (bottom → top of the stack).
  var MODULES = [
    { id: 'stills',     name: 'Architectural stills', desc: 'Set of 5 · still renders', price: 3500 },
    { id: 'floorstack', name: 'Floor-stack explorer', desc: 'Interactive unit picker', price: 7500 },
    { id: 'flythrough', name: 'Animated fly-through',  desc: '60s · cinematic',         price: 6000 },
    { id: 'model',      name: 'Interactive 3D model',  desc: 'Real-time · WebGL',        price: 9000 }
  ];

  var state = {
    base: 'practice',
    selected: {} // id -> true
  };

  var fmt = function (n) { return '€' + n.toLocaleString('en-US'); };

  var elSeg   = document.getElementById('seg-base');
  var elHint  = document.getElementById('base-hint');
  var elMods  = document.getElementById('mods');
  var elStack = document.getElementById('stack');
  var elTotal = document.getElementById('total');
  var elCount = document.getElementById('mod-count');

  /* ---- which selected modules are bundled-in (free) --------------- */
  function includedSet() {
    var base = BASES[state.base];
    var inc = {};
    if (base.included === 'all') {
      MODULES.forEach(function (m) { inc[m.id] = true; });
      return inc;
    }
    if (!base.included) return inc;
    // most valuable selected modules are the ones included
    var sel = MODULES.filter(function (m) { return state.selected[m.id]; })
                     .sort(function (a, b) { return b.price - a.price; });
    sel.slice(0, base.included).forEach(function (m) { inc[m.id] = true; });
    return inc;
  }

  /* ---- build module toggle rows ----------------------------------- */
  function renderMods() {
    var base = BASES[state.base];
    var lockAll = base.included === 'all';
    var inc = includedSet();
    elMods.innerHTML = '';

    MODULES.forEach(function (m) {
      var on = lockAll ? true : !!state.selected[m.id];
      var isIncl = on && inc[m.id];

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mod';
      btn.setAttribute('data-mod', m.id);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (lockAll) btn.setAttribute('data-locked', 'true');

      var priceLabel = isIncl
        ? '<span class="mod__incl">Included</span>'
        : '<span class="mod__price">+' + fmt(m.price) + '</span>';

      btn.innerHTML =
        '<span class="mod__box"></span>' +
        '<span class="mod__body">' +
          '<span class="mod__name">' + m.name + '</span>' +
          '<span class="mod__desc">' + m.desc + '</span>' +
        '</span>' + priceLabel;

      if (!lockAll) {
        btn.addEventListener('click', function () {
          state.selected[m.id] = !state.selected[m.id];
          render();
        });
      }
      elMods.appendChild(btn);
    });
  }

  /* ---- build the stack -------------------------------------------- */
  function renderStack(animateIds) {
    var base = BASES[state.base];
    var lockAll = base.included === 'all';
    var inc = includedSet();
    elStack.innerHTML = '';

    // base block (always at the bottom — flex-direction column-reverse)
    var baseBlk = document.createElement('div');
    baseBlk.className = 'blk blk--base';
    baseBlk.style.flexGrow = base.price;
    baseBlk.innerHTML = '<span class="blk__row"><span class="blk__name">' +
      base.label + ' · base</span><span class="blk__val">' + fmt(base.price) + '</span></span>';
    elStack.appendChild(baseBlk);

    MODULES.forEach(function (m) {
      var on = lockAll ? true : !!state.selected[m.id];
      if (!on) return;
      var isIncl = !!inc[m.id];

      var blk = document.createElement('div');
      blk.className = 'blk blk--mod' + (isIncl ? ' blk--incl' : '');
      blk.style.flexGrow = m.price; // mass ∝ value delivered
      if (isIncl) {
        // ghost block: value shown, cost zero
        blk.style.background = 'var(--canvas)';
        blk.style.color = 'var(--ink)';
        blk.style.outline = '1px solid var(--ink)';
        blk.style.outlineOffset = '-1px';
      }
      blk.innerHTML = '<span class="blk__row"><span class="blk__name">' +
        m.name + '</span><span class="blk__val">' +
        (isIncl ? 'Incl' : '+' + fmt(m.price)) + '</span></span>';

      if (animateIds && animateIds[m.id]) {
        blk.classList.add('blk--enter');
        requestAnimationFrame(function () {
          requestAnimationFrame(function () { blk.classList.remove('blk--enter'); });
        });
      }
      elStack.appendChild(blk);
    });
  }

  /* ---- totals ----------------------------------------------------- */
  function computeTotal() {
    var base = BASES[state.base];
    var lockAll = base.included === 'all';
    var inc = includedSet();
    var total = base.price;
    var count = 0;
    MODULES.forEach(function (m) {
      var on = lockAll ? true : !!state.selected[m.id];
      if (!on) return;
      count++;
      if (!inc[m.id]) total += m.price;
    });
    return { total: total, count: count };
  }

  /* ---- seg (base) ------------------------------------------------- */
  function renderSeg() {
    elSeg.querySelectorAll('button').forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-base') === state.base ? 'true' : 'false');
    });
    elHint.textContent = '— ' + BASES[state.base].hint;
  }

  var prevSelected = {};
  function render() {
    // figure out which module blocks are newly visible, to animate them in
    var lockAll = BASES[state.base].included === 'all';
    var nowOn = {};
    MODULES.forEach(function (m) { nowOn[m.id] = lockAll ? true : !!state.selected[m.id]; });
    var entering = {};
    MODULES.forEach(function (m) { if (nowOn[m.id] && !prevSelected[m.id]) entering[m.id] = true; });
    prevSelected = nowOn;

    renderSeg();
    renderMods();
    renderStack(entering);

    var t = computeTotal();
    elTotal.textContent = fmt(t.total);
    elCount.textContent = t.count + (t.count === 1 ? ' module' : ' modules');
  }

  elSeg.querySelectorAll('button').forEach(function (b) {
    b.addEventListener('click', function () {
      state.base = b.getAttribute('data-base');
      render();
    });
  });

  // sensible default selection so the stack reads well on load
  state.selected.stills = true;
  state.selected.flythrough = true;
  render();
})();
