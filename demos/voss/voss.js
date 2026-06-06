/* ===========================================================================
   ATELIER VOSS — voss.js
   Quiet interactions: scroll progress, gentle reveals, a live Bergen clock,
   a clause-by-clause statement, an editorial project index with sticky
   hover-preview + inline detail, the "around the light" daylight study,
   the materials palette, and the inquiry form.
   =========================================================================== */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion:reduce)").matches;

  /* ---------- scroll progress ---------- */
  var bar = document.getElementById("progress");
  function onScroll() {
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    bar.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + "%";
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- reveal on scroll ---------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    });
  }, { threshold: 0.16, rootMargin: "0px 0px -8% 0px" });
  document.querySelectorAll("[data-reveal],[data-reveal-img]").forEach(function (el) {
    if (reduce) { el.classList.add("in"); } else { io.observe(el); }
  });

  /* ---------- count-up stats ---------- */
  function countUp(el) {
    var target = parseInt(el.getAttribute("data-count"), 10);
    if (reduce) { el.textContent = target; return; }
    var t0 = null, dur = 1400;
    function step(t) {
      if (!t0) t0 = t;
      var p = Math.min((t - t0) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var statIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { countUp(e.target); statIO.unobserve(e.target); }
    });
  }, { threshold: 0.6 });
  document.querySelectorAll("[data-count]").forEach(function (el) { statIO.observe(el); });

  /* ---------- live Bergen clock ---------- */
  var clock = document.getElementById("navClock");
  function tick() {
    try {
      var t = new Date().toLocaleTimeString("en-GB", { timeZone: "Europe/Oslo", hour: "2-digit", minute: "2-digit" });
      clock.innerHTML = "Bergen · 60°N · <b>" + t + "</b>";
    } catch (e) { clock.innerHTML = "Bergen · 60°N"; }
  }
  tick(); setInterval(tick, 20000);

  /* ---------- clause-by-clause statement ---------- */
  var clauses = document.querySelectorAll("#statement .clause");
  if (clauses.length) {
    if (reduce) {
      clauses.forEach(function (c) { c.classList.add("lit"); });
    } else {
      var stmt = document.getElementById("statement");
      function litByScroll() {
        var r = stmt.getBoundingClientRect();
        var vh = window.innerHeight;
        // progress as the paragraph travels through the comfortable reading band
        var prog = (vh * 0.82 - r.top) / (r.height + vh * 0.18);
        prog = Math.max(0, Math.min(1, prog));
        var lit = Math.round(prog * clauses.length);
        clauses.forEach(function (c, i) { c.classList.toggle("lit", i < lit); });
      }
      window.addEventListener("scroll", litByScroll, { passive: true });
      litByScroll();
    }
  }

  /* =========================================================================
     PROJECT INDEX
     ========================================================================= */
  var PROJECTS = [
    { id: "fjord", name: "Fjord House", type: "House", place: "Vestland", yr: "2025",
      seed: "voss-fjord", img: "img/fjord.webp",
      desc: "A single-storey timber house following the slope to the water, its roof a long unbroken line of larch. The plan is a row of rooms, each turned a few degrees to catch its own view of the fjord.",
      specs: { Area: "180 m²", Material: "Larch · oak · slate", Structure: "Cross-laminated timber", Completed: "2025" } },
    { id: "skog", name: "Skog Cabin", type: "Cabin", place: "Telemark", yr: "2024",
      seed: "voss-cabin", img: "img/cabin.webp",
      desc: "A 48 m² retreat in pine forest. One room, one hearth, three windows for three views — sized so it can be built in a single short Nordic summer by a small crew.",
      specs: { Area: "48 m²", Material: "Pine · birch ply", Structure: "Timber frame", Completed: "2024" } },
    { id: "lys", name: "Lys Chapel", type: "Public", place: "Hordaland", yr: "2023",
      seed: "voss-chapel", img: "img/chapel.webp",
      desc: "A small place of stillness lit from a single high slot — daylight as the only ornament. The walls are lime-washed by hand so the light turns warm as the day draws down.",
      specs: { Area: "90 m²", Material: "Lime plaster · oak", Structure: "Load-bearing masonry", Completed: "2023" } },
    { id: "boat", name: "Stone Boathouse", type: "House", place: "Sognefjord", yr: "2024",
      seed: "voss-boat", img: "img/boat.webp",
      desc: "A working boathouse rebuilt as a summer dwelling, keeping its dry-stone base and gaining a warm timber room above that opens fully to the water on still evenings.",
      specs: { Area: "70 m²", Material: "Stone · pine · glass", Structure: "Stone base · timber upper", Completed: "2024" } },
    { id: "birch", name: "Birch Studio", type: "Public", place: "Voss", yr: "2022",
      seed: "voss-birch", img: "img/birch.webp",
      desc: "An artist's studio in a birch clearing — a quiet north-lit room for painting, with a small wood stove and a long bench built from a single felled tree on the site.",
      specs: { Area: "55 m²", Material: "Birch · concrete", Structure: "Timber frame", Completed: "2022" } },
    { id: "tworoofs", name: "Two-Roofs House", type: "House", place: "Bergen", yr: "2021",
      seed: "voss-tworoofs", img: "img/tworoofs.webp",
      desc: "A family house on a steep city edge, split under two pitched roofs so that every room keeps a low winter sun and a sheltered south garden between the two halves.",
      specs: { Area: "210 m²", Material: "Spruce · zinc · oak", Structure: "Timber frame", Completed: "2021" } }
  ];
  function imgFor(seed, n, w, h) { return "https://picsum.photos/seed/" + seed + (n || "") + "/" + (w || 1200) + "/" + (h || 900); }
  var plist = document.getElementById("plist");
  var ppreview = document.getElementById("ppreview");

  // build preview layers (one per project) for cross-fade
  PROJECTS.forEach(function (p, i) {
    var d = document.createElement("div");
    d.className = "pimg" + (i === 0 ? " show" : "");
    d.setAttribute("data-id", p.id);
    d.innerHTML = '<img class="ph" src="' + (p.img || imgFor(p.seed, 0, 1000, 1250)) + '" alt="' + p.name + '">';
    ppreview.appendChild(d);
  });
  var pcap = document.createElement("div");
  pcap.className = "pcap";
  pcap.innerHTML = '<span class="t serif"></span><span class="y"></span>';
  ppreview.appendChild(pcap);
  function setPreview(p) {
    ppreview.querySelectorAll(".pimg").forEach(function (l) {
      l.classList.toggle("show", l.getAttribute("data-id") === p.id);
    });
    pcap.querySelector(".t").textContent = p.name;
    pcap.querySelector(".y").textContent = p.place + " · " + p.yr;
  }
  setPreview(PROJECTS[0]);

  // build rows
  PROJECTS.forEach(function (p, i) {
    var row = document.createElement("article");
    row.className = "prow";
    row.setAttribute("data-type", p.type);
    row.setAttribute("data-id", p.id);

    var specHTML = Object.keys(p.specs).map(function (k) {
      return '<div class="spec"><div class="k">' + k + '</div><div class="v">' + p.specs[k] + "</div></div>";
    }).join("");

    row.innerHTML =
      '<div class="prow__head">' +
        '<span class="prow__no">' + ("0" + (i + 1)).slice(-2) + "</span>" +
        '<span class="prow__name serif">' + p.name + "</span>" +
        '<span class="prow__place">' + p.place + " · " + p.yr +
          '<span class="prow__plus" aria-hidden="true"></span></span>' +
      "</div>" +
      '<div class="prow__thumb rimg"><img class="ph" src="' + (p.img || imgFor(p.seed, 0, 1200, 760)) + '" alt="' + p.name + '"></div>' +
      '<div class="prow__detail"><div class="prow__detail-in">' +
        "<p>" + p.desc + "</p>" +
        '<div class="specs">' + specHTML + "</div>" +
        '<div class="gal"><img class="ph" style="width:100%;aspect-ratio:16/9" src="' + (p.img || imgFor(p.seed, 1, 1200, 700)) + '" alt="' + p.name + '"></div>' +
      "</div></div>";

    // hover → preview
    row.addEventListener("mouseenter", function () {
      if (window.matchMedia("(hover:hover)").matches) setPreview(p);
    });
    // click → expand
    var head = row.querySelector(".prow__head");
    var detail = row.querySelector(".prow__detail");
    head.addEventListener("click", function () {
      var open = row.classList.contains("active");
      // close siblings
      plist.querySelectorAll(".prow.active").forEach(function (r) {
        if (r !== row) { r.classList.remove("active"); r.querySelector(".prow__detail").style.maxHeight = "0px"; }
      });
      if (open) {
        row.classList.remove("active");
        detail.style.maxHeight = "0px";
      } else {
        row.classList.add("active");
        detail.style.maxHeight = detail.querySelector(".prow__detail-in").scrollHeight + "px";
        setPreview(p);
      }
    });
    plist.appendChild(row);
  });

  // keep open accordions sized correctly on resize
  window.addEventListener("resize", function () {
    plist.querySelectorAll(".prow.active").forEach(function (r) {
      r.querySelector(".prow__detail").style.maxHeight = r.querySelector(".prow__detail-in").scrollHeight + "px";
    });
  });

  /* ---------- filter ---------- */
  var filters = document.getElementById("filters");
  filters.addEventListener("click", function (e) {
    var btn = e.target.closest("button");
    if (!btn) return;
    var f = btn.getAttribute("data-f");
    filters.querySelectorAll("button").forEach(function (b) {
      b.setAttribute("aria-pressed", b === btn ? "true" : "false");
    });
    var firstVisible = null;
    plist.querySelectorAll(".prow").forEach(function (r) {
      var show = f === "all" || r.getAttribute("data-type") === f;
      r.classList.toggle("hide", !show);
      if (show && !firstVisible) firstVisible = r;
      // collapse hidden
      if (!show && r.classList.contains("active")) {
        r.classList.remove("active");
        r.querySelector(".prow__detail").style.maxHeight = "0px";
      }
    });
    if (firstVisible) {
      var id = firstVisible.getAttribute("data-id");
      var p = PROJECTS.filter(function (x) { return x.id === id; })[0];
      if (p) setPreview(p);
    }
  });

  /* =========================================================================
     AROUND THE LIGHT  —  a year of Bergen daylight (≈60.4°N)
     ========================================================================= */
  var MONTHS = [
    { m: "January",   hrs: 6.6,  alt: 9 },
    { m: "February",  hrs: 9.1,  alt: 17 },
    { m: "March",     hrs: 11.8, alt: 28 },
    { m: "April",     hrs: 14.6, alt: 40 },
    { m: "May",       hrs: 17.2, alt: 49 },
    { m: "June",      hrs: 18.8, alt: 53 },
    { m: "July",      hrs: 18.0, alt: 51 },
    { m: "August",    hrs: 15.6, alt: 43 },
    { m: "September", hrs: 12.7, alt: 32 },
    { m: "October",   hrs: 10.0, alt: 21 },
    { m: "November",  hrs: 7.2,  alt: 12 },
    { m: "December",  hrs: 5.9,  alt: 7 }
  ];
  var lSlider = document.getElementById("lSlider");
  var lMonth = document.getElementById("lMonth");
  var lHours = document.getElementById("lHours");
  var lAlt = document.getElementById("lAlt");
  var lImg = document.getElementById("lightImg");
  var lTint = document.getElementById("lightTint");
  var lVeil = document.getElementById("lightVeil");
  var sun = document.getElementById("skySun");

  function mix(a, b, t) { return Math.round(a + (b - a) * t); }
  function applyLight(i) {
    var d = MONTHS[i];
    lMonth.textContent = d.m;
    lHours.textContent = d.hrs.toFixed(1);
    lAlt.textContent = d.alt;

    // warmth 0 (deep winter) → 1 (high summer)
    var warm = Math.max(0, Math.min(1, (d.alt - 7) / (53 - 7)));

    // image: winter cooler + dimmer, summer brighter + a touch warmer
    var bright = (0.78 + warm * 0.34).toFixed(2);
    var sat = (0.7 + warm * 0.5).toFixed(2);
    var hue = Math.round((1 - warm) * -8); // slight cool cast in winter
    lImg.style.filter = "brightness(" + bright + ") saturate(" + sat + ") hue-rotate(" + hue + "deg) contrast(1.02)";

    // tint layer (soft-light): cold blue → warm amber
    var r = mix(120, 240, warm), g = mix(150, 205, warm), bl = mix(190, 150, warm);
    lTint.style.background = "rgb(" + r + "," + g + "," + bl + ")";
    lTint.style.opacity = (0.5 - warm * 0.18).toFixed(2);

    // veil: winter adds a cold darkening from the top
    var veilA = (0.32 * (1 - warm)).toFixed(2);
    lVeil.style.background = "linear-gradient(180deg, rgba(40,52,74," + veilA + ") 0%, rgba(40,52,74,0) 60%)";

    // sun position along the arc: x by hours of light (longer day = higher path span),
    // y by altitude (higher sun = higher on the arc)
    var px = 10 + warm * 0 + 50 * 0; // center the apex; move slightly with season
    var xPct = 20 + (i / 11) * 60;   // walk the sun left→right across the year
    var apex = 1 - d.alt / 60;       // 0 = top, 1 = horizon
    // follow the drawn quadratic arc roughly: y dips toward middle
    var t = (xPct - 20) / 60;
    var arcY = Math.pow(2 * t - 1, 2);        // 0 at center, 1 at ends
    var yPct = 12 + arcY * 70 + apex * 14;    // combine arc shape with altitude
    sun.style.left = xPct + "%";
    sun.style.top = Math.min(96, yPct) + "%";
    var sr = mix(250, 255, warm), sg = mix(214, 232, warm), sb = mix(150, 188, warm);
    sun.style.background = "radial-gradient(circle, #fff 0%, rgb(" + sr + "," + sg + "," + sb + ") 55%, rgba(255,255,255,0) 72%)";
  }
  lSlider.addEventListener("input", function () { applyLight(parseInt(lSlider.value, 10)); });
  applyLight(parseInt(lSlider.value, 10));

  /* =========================================================================
     MATERIALS
     ========================================================================= */
  var MATERIALS = [
    { name: "Larch", note: "Cladding, left to silver", c: "linear-gradient(150deg,#b89a6f,#8f6f48)" },
    { name: "Pine",  note: "Floors and linings", c: "linear-gradient(150deg,#e3c79a,#c19a63)" },
    { name: "Slate", note: "Roofs and thresholds", c: "linear-gradient(150deg,#5c5f63,#34373b)" },
    { name: "Lime",  note: "Hand-washed walls", c: "linear-gradient(150deg,#efece3,#d8d2c4)" },
    { name: "Oak",   note: "Doors and joinery", c: "linear-gradient(150deg,#c8a878,#9a7747)" },
    { name: "Glass", note: "Framing the daylight", c: "linear-gradient(150deg,#cfe0df,#9fb9bd)" }
  ];
  var sw = document.getElementById("swatches");
  MATERIALS.forEach(function (m) {
    var el = document.createElement("div");
    el.className = "swatch";
    el.innerHTML =
      '<div class="swatch__chip" style="background:' + m.c + '"></div>' +
      '<div class="swatch__name serif">' + m.name + "</div>" +
      '<div class="swatch__note">' + m.note + "</div>";
    sw.appendChild(el);
  });

  /* =========================================================================
     INQUIRY FORM
     ========================================================================= */
  var types = document.getElementById("types");
  types.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b) return;
    var on = b.getAttribute("aria-pressed") === "true";
    types.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
    b.setAttribute("aria-pressed", on ? "false" : "true");
  });

  var form = document.getElementById("inquiry");
  var note = document.getElementById("formNote");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var email = document.getElementById("f-email").value.trim();
    var name = document.getElementById("f-name").value.trim();
    var ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    note.classList.remove("ok");
    if (!name) { note.textContent = "— Please add your name."; document.getElementById("f-name").focus(); return; }
    if (!ok) { note.textContent = "— A valid email is needed so we can reply."; document.getElementById("f-email").focus(); return; }
    note.textContent = "Thank you — we'll be in touch within a week.";
    note.classList.add("ok");
    form.reset();
    types.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
  });
})();
