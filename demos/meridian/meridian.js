/* ===========================================================================
   MERIDIAN — meridian.js
   Cinematic refinements + the live floor-availability explorer.
   =========================================================================== */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion:reduce)").matches;

  /* ---------- scroll progress + nav solidify + parallax ---------- */
  var bar = document.getElementById("progress");
  var nav = document.getElementById("nav");
  var ribbon = document.querySelector(".ds-ribbon");
  var ribbonH = ribbon ? ribbon.offsetHeight : 0;
  window.addEventListener("resize", function () { ribbonH = ribbon ? ribbon.offsetHeight : 0; onScroll(); });
  var heroImg = document.getElementById("heroImg");
  var viewImg = document.getElementById("viewImg");
  function onScroll() {
    var h = document.documentElement, y = h.scrollTop;
    var max = h.scrollHeight - h.clientHeight;
    bar.style.width = (max > 0 ? (y / max) * 100 : 0) + "%";
    nav.style.top = Math.max(0, ribbonH - y) + "px";
    nav.classList.toggle("solid", y > window.innerHeight * 0.7);
    if (!reduce) {
      if (heroImg && y < window.innerHeight) heroImg.style.transform = "translateY(" + (y * 0.18) + "px)";
      if (viewImg) {
        var r = viewImg.getBoundingClientRect();
        if (r.bottom > 0 && r.top < window.innerHeight) {
          var p = (window.innerHeight - r.top) / (window.innerHeight + r.height);
          viewImg.style.transform = "translateY(" + ((p - 0.5) * 60) + "px)";
        }
      }
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- reveals ---------- */
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: 0.14, rootMargin: "0px 0px -6% 0px" });
  document.querySelectorAll("[data-reveal],.rimg").forEach(function (el) {
    if (reduce) el.classList.add("in"); else io.observe(el);
  });

  /* ---------- count-up ---------- */
  function countUp(el) {
    var target = parseInt(el.getAttribute("data-count"), 10);
    var pre = el.querySelector("span") ? el.querySelector("span").outerHTML : "";
    if (reduce) { el.innerHTML = pre + target; return; }
    var t0 = null;
    function step(t) {
      if (!t0) t0 = t;
      var p = Math.min((t - t0) / 1500, 1), e = 1 - Math.pow(1 - p, 3);
      el.innerHTML = pre + Math.round(target * e);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var cio = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { countUp(e.target); cio.unobserve(e.target); } });
  }, { threshold: 0.6 });
  document.querySelectorAll("[data-count]").forEach(function (el) { cio.observe(el); });

  /* =========================================================================
     FLOOR DATA  — deterministic, so availability is stable across reloads
     ========================================================================= */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var rand = mulberry32(41280);
  var FLOOR_H = 3.46; // metres per floor

  // tier resolver per floor
  function tierOf(f) {
    if (f === 1) return { key: "amenity", name: "Arrival & Lobby", note: "The arrival hall, valet and 24-hour concierge." };
    if (f === 2) return { key: "amenity", name: "Wellness Floor", note: "Spa, sauna, gym and a quiet treatment suite." };
    if (f === 3) return { key: "amenity", name: "The Pool Deck", note: "A 25-metre infinity pool facing the harbour mouth." };
    if (f === 39) return { key: "amenity", name: "The Sky Lounge", note: "Residents' lounge, library and private dining." };
    if (f >= 4 && f <= 18) return { key: "oneBed", name: "The Pied-à-Terre", beds: "1 bed", units: 4, base: 58, rate: 10800 };
    if (f >= 19 && f <= 34) return { key: "skyRes", name: "The Sky Residence", beds: "2—3 bed", units: 3, base: 104, rate: 12600 };
    if (f >= 35 && f <= 38) return { key: "villa", name: "Sky Villa", beds: "3 bed", units: 2, base: 180, rate: 15800 };
    if (f === 40) return { key: "villa", name: "The Lower Penthouse", beds: "4 bed", units: 1, base: 264, rate: 0, poa: true };
    if (f === 41) return { key: "villa", name: "The Penthouse", beds: "4 bed duplex", units: 1, base: 312, rate: 0, poa: true };
    return { key: "amenity", name: "Plant", note: "Building services." };
  }
  var ASPECTS4 = ["North · City", "East · Sunrise", "South · Harbour", "West · Sunset"];
  var ASPECTS3 = ["East · Sunrise", "South · Harbour", "West · Sunset"];
  var ASPECTS2 = ["South · Harbour", "West · Sunset"];

  function priceFmt(n) { return "€" + n.toLocaleString("en-US"); }

  var FLOORS = [];
  for (var f = 1; f <= 41; f++) {
    var tier = tierOf(f);
    var floor = { f: f, height: Math.round(f * FLOOR_H), tier: tier, units: [], state: "amenity" };
    if (tier.key !== "amenity") {
      var nUnits = tier.units;
      var aspects = nUnits === 4 ? ASPECTS4 : nUnits === 3 ? ASPECTS3 : nUnits === 2 ? ASPECTS2 : ["360° · Panorama"];
      // higher floors: more available/reserved; lower: more sold
      var soldBias = Math.max(0.08, 0.78 - (f / 41) * 0.74); // ~0.7 low → ~0.1 high
      for (var u = 0; u < nUnits; u++) {
        var r = rand();
        var state = r < soldBias ? "sold" : (r < soldBias + 0.22 ? "reserved" : "available");
        var sizeJitter = Math.round((rand() - 0.5) * 8);
        var size = tier.base + sizeJitter + (nUnits === 1 ? 0 : 0);
        var price = tier.poa ? null : Math.round((size * tier.rate + f * 5200) / 1000) * 1000;
        var letter = String.fromCharCode(65 + u);
        floor.units.push({
          id: f + letter,
          beds: tier.beds,
          size: size,
          aspect: aspects[u % aspects.length],
          price: price,
          poa: !!tier.poa,
          state: state
        });
      }
      // floor aggregate state
      var hasAvail = floor.units.some(function (x) { return x.state === "available"; });
      var hasRes = floor.units.some(function (x) { return x.state === "reserved"; });
      floor.state = hasAvail ? "available" : (hasRes ? "reserved" : "sold");
      floor.availCount = floor.units.filter(function (x) { return x.state === "available"; }).length;
    }
    FLOORS.push(floor);
  }

  // remaining counter (available units across all sellable floors, scaled to read like 280 total)
  var sellable = FLOORS.filter(function (fl) { return fl.tier.key !== "amenity"; });
  var totalUnits = sellable.reduce(function (a, fl) { return a + fl.units.length; }, 0);
  var availUnits = sellable.reduce(function (a, fl) { return a + fl.units.filter(function (u) { return u.state === "available"; }).length; }, 0);
  // present on a 280 scale
  var remainOn280 = Math.round(availUnits / totalUnits * 280);

  // unit lookup for the shortlist
  var UNIT_BY_ID = {};
  FLOORS.forEach(function (fl) {
    fl.units.forEach(function (u) { UNIT_BY_ID[u.id] = { u: u, floor: fl.f, tierName: fl.tier.name }; });
  });

  // shortlist state (persisted)
  var SHORT_KEY = "meridian-shortlist";
  var shortlist = [];
  try { shortlist = JSON.parse(localStorage.getItem(SHORT_KEY) || "[]"); } catch (e) { shortlist = []; }
  shortlist = shortlist.filter(function (id) { return UNIT_BY_ID[id] && UNIT_BY_ID[id].u.state === "available"; });
  function saveShort() { try { localStorage.setItem(SHORT_KEY, JSON.stringify(shortlist)); } catch (e) {} }

  /* =========================================================================
     RENDER TOWER  (floor 41 at top → floor 1 at bottom)
     ========================================================================= */
  var tower = document.getElementById("tower");
  var panel = document.getElementById("panel");
  var remainEl = document.getElementById("remainCount");
  remainEl.textContent = remainOn280;

  var currentFilter = "all";
  var selectedFloor = null;

  function floorMatches(fl, filter) {
    if (filter === "all") return fl.tier.key !== "amenity";
    return fl.tier.key === filter;
  }

  function buildTower() {
    tower.innerHTML = "";
    for (var i = FLOORS.length - 1; i >= 0; i--) {
      (function (fl) {
        var el = document.createElement("div");
        el.className = "floor" + (fl.tier.key === "amenity" ? " amenity" : "");
        el.setAttribute("data-state", fl.state);
        el.setAttribute("data-floor", fl.f);
        el.setAttribute("role", "option");
        var fillPct = fl.tier.key === "amenity" ? 0 : (fl.availCount / fl.units.length) * 100;
        var col = fl.state === "available" ? "var(--gold)" : fl.state === "reserved" ? "var(--reserved)" : "var(--sold)";
        el.style.setProperty("--fill", fillPct + "%");
        el.style.setProperty("--barcol", col);
        el.innerHTML =
          '<span class="floor__no">' + ("0" + fl.f).slice(-2) + "</span>" +
          '<span class="floor__tag">' + fl.tier.name + (fl.tier.beds ? " · " + fl.tier.beds : "") + "</span>" +
          '<span class="dot"></span>';
        if (fl.tier.key !== "amenity") {
          el.addEventListener("click", function () { selectFloor(fl.f); });
          el.addEventListener("mouseenter", function () { if (window.matchMedia("(hover:hover)").matches) renderPanel(fl, true); });
        }
        tower.appendChild(el);
      })(FLOORS[i]);
    }
    applyFilterVisual();
  }

  function applyFilterVisual() {
    tower.querySelectorAll(".floor").forEach(function (el) {
      var f = parseInt(el.getAttribute("data-floor"), 10);
      var fl = FLOORS[f - 1];
      var match = currentFilter === "all" ? true : fl.tier.key === currentFilter;
      el.classList.toggle("dim", !match && fl.tier.key !== "amenity" || (currentFilter !== "all" && fl.tier.key === "amenity"));
    });
  }

  function markSelected(f) {
    tower.querySelectorAll(".floor").forEach(function (el) {
      el.classList.toggle("sel", parseInt(el.getAttribute("data-floor"), 10) === f);
    });
  }

  /* ---------- panel ---------- */
  // Map a floor to one of four view-by-height-band images (with placeholder fallback
  // until the real renders are added to img/). Height bands by metres above ground.
  function viewBandFor(f) {
    var h = f * FLOOR_H;
    if (h >= 130) return "crown";
    if (h >= 95)  return "high";
    if (h >= 55)  return "mid";
    return "low";
  }
  function viewSeedFor(f) { return "meridian-view-" + viewBandFor(f); }

  function renderPanel(fl, isHover) {
    if (!isHover) selectedFloor = fl.f;
    markSelected(fl.f);

    var band = viewBandFor(fl.f);
    var localSrc = "img/view-" + band + ".webp";
    var fallbackSrc = "https://picsum.photos/seed/" + viewSeedFor(fl.f) + "/1000/520";
    var head =
      '<div class="panel__media"><img src="' + localSrc + '" onerror="this.onerror=null;this.src=\'' + fallbackSrc + '\'" alt="View from floor ' + fl.f + '">' +
        '<div class="meta">' +
          '<div class="panel__fno"><span class="big serif">' + ("0" + fl.f).slice(-2) + '</span>' +
            '<div class="panel__tier">' + fl.tier.name + "</div></div>" +
          '<div class="panel__height">Height above ground<b class="serif tnum">' + fl.height + " m</b></div>" +
        "</div>" +
      "</div>";

    var body;
    if (fl.tier.key === "amenity") {
      body = '<div class="panel__body"><div class="panel__amenity">' +
        "<span class=\"kicker\">Shared amenity</span>" +
        '<h3 class="serif">' + fl.tier.name + "</h3>" +
        "<p>" + (fl.tier.note || "") + "</p>" +
        "</div>" +
        '<div class="panel__cta"><a href="#amen" class="btn">See all amenities</a></div>' +
        "</div>";
    } else {
      var availOnFloor = fl.units.filter(function (u) { return u.state === "available"; }).length;
      var rows = fl.units.map(function (u) {
        var price = u.poa ? "On application" : priceFmt(u.price);
        var saveCell = u.state === "available"
          ? '<button class="unit__save' + (shortlist.indexOf(u.id) >= 0 ? " on" : "") + '" data-save="' + u.id + '" aria-label="Save residence ' + u.id + '" title="Save to shortlist"><svg viewBox="0 0 24 24"><path d="M6 3 h12 a1 1 0 0 1 1 1 v17 l-7-5 -7 5 v-17 a1 1 0 0 1 1-1 z"/></svg></button>'
          : '<span class="unit__spacer"></span>';
        return '<div class="unit ' + u.state + '">' +
          '<span class="unit__id serif">' + u.id + "</span>" +
          '<span class="unit__spec"><b>' + u.beds + "</b> · " + u.size + " m² · " + u.aspect + "</span>" +
          '<span class="unit__right"><span class="unit__price">' + price + "</span>" +
            '<span class="unit__status ' + u.state + '">' + u.state + "</span></span>" +
          saveCell +
          "</div>";
      }).join("");
      body = '<div class="panel__body">' +
        '<div class="panel__row"><span class="lab">Floor ' + fl.f + " · " + fl.tier.name + '</span>' +
          '<span class="val serif">' + availOnFloor + " of " + fl.units.length + " available</span></div>" +
        '<div class="units">' + rows + "</div>" +
        '<div class="panel__cta"><button class="btn btn--solid" data-reserve="' + fl.tier.key + '">Reserve a viewing</button>' +
          '<span style="font-size:12px;color:var(--muted);letter-spacing:.04em">' + fl.units[0].beds + " · from " +
          (fl.units.some(function(u){return !u.poa;}) ? priceFmt(Math.min.apply(null, fl.units.filter(function(u){return !u.poa;}).map(function(u){return u.price;}))) : "On application") +
          "</span></div>" +
        "</div>";
    }
    panel.innerHTML = head + body;

    var rb = panel.querySelector("[data-reserve]");
    if (rb) rb.addEventListener("click", function () {
      selectResidence(rb.getAttribute("data-reserve"), fl);
    });
    panel.querySelectorAll("[data-save]").forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        toggleShort(b.getAttribute("data-save"));
      });
    });
  }

  /* ---------- shortlist ---------- */
  var toastEl = document.getElementById("toast");
  var toastMsg = document.getElementById("toastMsg");
  var toastTimer = null;
  function toast(msg) {
    if (!toastEl) return;
    toastMsg.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2200);
  }
  var regShort = document.getElementById("regShort");
  var slList = document.getElementById("slList");
  var slCount = document.getElementById("slCount");
  function renderShortlist() {
    if (slCount) slCount.textContent = shortlist.length;
    if (regShort) regShort.classList.toggle("show", shortlist.length > 0);
    if (!slList) return;
    slList.innerHTML = shortlist.map(function (id) {
      var rec = UNIT_BY_ID[id]; if (!rec) return "";
      var u = rec.u;
      var price = u.poa ? "On application" : priceFmt(u.price);
      return "<li>" +
        '<span class="u-id serif">' + u.id + "</span>" +
        '<span class="u-spec"><b>' + u.beds + "</b> · " + u.size + " m² · Floor " + rec.floor + "</span>" +
        '<span class="u-price">' + price + "</span>" +
        '<button class="u-remove" data-remove="' + u.id + '" aria-label="Remove ' + u.id + '">×</button>' +
        "</li>";
    }).join("");
    slList.querySelectorAll("[data-remove]").forEach(function (b) {
      b.addEventListener("click", function () { toggleShort(b.getAttribute("data-remove")); });
    });
  }
  function refreshSaveButtons() {
    panel.querySelectorAll("[data-save]").forEach(function (b) {
      b.classList.toggle("on", shortlist.indexOf(b.getAttribute("data-save")) >= 0);
    });
  }
  function toggleShort(id) {
    var i = shortlist.indexOf(id);
    if (i >= 0) { shortlist.splice(i, 1); toast("Removed from shortlist"); }
    else { shortlist.push(id); toast("Added · " + (shortlist.length) + " in shortlist"); }
    saveShort();
    renderShortlist();
    refreshSaveButtons();
  }

  function selectFloor(f) { renderPanel(FLOORS[f - 1], false); }

  /* ---------- filters ---------- */
  var towerFilters = document.getElementById("towerFilters");
  towerFilters.addEventListener("click", function (e) {
    var btn = e.target.closest("button"); if (!btn) return;
    currentFilter = btn.getAttribute("data-f");
    towerFilters.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", b === btn ? "true" : "false"); });
    applyFilterVisual();
    // jump to first available matching floor (from the top)
    var pick = null;
    for (var i = FLOORS.length - 1; i >= 0; i--) {
      var fl = FLOORS[i];
      if (floorMatches(fl, currentFilter) && fl.state === "available") { pick = fl; break; }
    }
    if (!pick) for (var j = FLOORS.length - 1; j >= 0; j--) { if (floorMatches(FLOORS[j], currentFilter)) { pick = FLOORS[j]; break; } }
    if (pick) renderPanel(pick, false);
  });

  /* ---------- residences cards jump to explorer ---------- */
  document.querySelectorAll("[data-jump]").forEach(function (card) {
    card.addEventListener("click", function () {
      var key = card.getAttribute("data-jump");
      var btn = towerFilters.querySelector('[data-f="' + key + '"]');
      if (btn) btn.click();
      document.getElementById("explorer").scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    });
  });

  /* ---------- register tie-in ---------- */
  var regPick = document.getElementById("regPick");
  var regPickVal = document.getElementById("regPickVal");
  var regSelect = document.getElementById("regSelect");
  var NAMES = { oneBed: "The Pied-à-Terre — 1 bed", skyRes: "The Sky Residence — 2—3 bed", villa: "Villas & Penthouses" };
  function selectResidence(key, fl) {
    if (regSelect) regSelect.value = key;
    regPickVal.textContent = NAMES[key] + (fl ? " · Floor " + fl.f : "");
    regPick.classList.add("show");
    document.getElementById("reg").scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }

  /* ---------- boot explorer ---------- */
  buildTower();
  // default selection: the lowest available residence (a real "entry" home)
  var firstAvail = FLOORS.filter(function (fl) { return fl.tier.key !== "amenity" && fl.state === "available"; })[0] || sellable[0];
  renderPanel(firstAvail, false);
  renderShortlist();

  /* ---------- keyboard navigation of the tower ---------- */
  var sellableAsc = FLOORS.filter(function (fl) { return fl.tier.key !== "amenity"; }).map(function (fl) { return fl.f; });
  tower.setAttribute("tabindex", "0");
  tower.addEventListener("keydown", function (e) {
    var visible = sellableAsc.filter(function (f) { return currentFilter === "all" || FLOORS[f - 1].tier.key === currentFilter; });
    if (!visible.length) return;
    var idx = visible.indexOf(selectedFloor);
    if (idx < 0) idx = 0;
    var handled = true;
    if (e.key === "ArrowUp") idx = Math.min(visible.length - 1, idx + 1);
    else if (e.key === "ArrowDown") idx = Math.max(0, idx - 1);
    else if (e.key === "Home") idx = 0;
    else if (e.key === "End") idx = visible.length - 1;
    else handled = false;
    if (handled) {
      e.preventDefault();
      tower.classList.add("kb");
      selectFloor(visible[idx]);
    }
  });
  tower.addEventListener("blur", function () { tower.classList.remove("kb"); });

  /* ---------- register form ---------- */
  var form = document.getElementById("reg-form");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var email = form.querySelector('input[name=email]');
    var s = form.querySelector(".status");
    if (!email.value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
      s.textContent = "— A valid email is required."; email.focus(); return;
    }
    form.querySelectorAll("input,select,button").forEach(function (el) { el.disabled = true; });
    s.textContent = "— Received" + (shortlist.length ? ", " + shortlist.length + " residence" + (shortlist.length > 1 ? "s" : "") + " shortlisted" : "") + ". Our sales team will be in touch shortly.";
  });
})();
