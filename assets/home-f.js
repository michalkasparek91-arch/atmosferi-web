/* Atmosferi° homepage on the shared Fabrica system (for-agencies.css + home-f.css).
   Only what unified-home.js does not already do: the .js hook, the wordmark
   letter rise and the hero load state. Menu, rail, gallery, reveals and the
   film button stay in unified-home.js so the i18n layer keeps working. */
(function () {
  "use strict";
  var doc = document.documentElement;
  doc.classList.add("js");

  var word = document.querySelector(".f-hero__word");
  if (word) {
    var text = word.textContent;
    word.textContent = "";
    Array.prototype.forEach.call(text, function (ch, i) {
      var s = document.createElement("span");
      s.textContent = ch;
      s.style.setProperty("--i", String(i));
      word.appendChild(s);
    });
  }

  var hero = document.getElementById("home");
  var film = document.getElementById("heroFilm");
  if (hero) {
    var done = false;
    var start = function () {
      if (done) return;
      done = true;
      requestAnimationFrame(function () { requestAnimationFrame(function () { hero.classList.add("is-loaded"); }); });
    };
    if (film && film.readyState < 2) film.addEventListener("loadeddata", start, { once: true });
    else start();
    // Never hold the page hostage to a slow video.
    setTimeout(start, 700);
  }

  // Small cascade inside the website rail and the gallery.
  document.querySelectorAll("#websiteRail .un-work-card").forEach(function (el, i) { el.style.setProperty("--d", String(i)); });
})();

/* Gallery: first screen curated, "Show all images" expands in place. The
   lightbox reads the whole gallery, so hidden tiles still work in it. */
(function () {
  "use strict";
  var grid = document.getElementById("visualGallery");
  var btn = document.getElementById("galleryMore");
  if (!grid || !btn) return;
  var sync = function () {
    var total = grid.querySelectorAll(".un-viz-item").length;
    btn.parentNode.hidden = total <= 11;
  };
  btn.addEventListener("click", function () {
    var open = grid.classList.toggle("is-collapsed") === false;
    btn.setAttribute("aria-expanded", String(open));
    if (!open) grid.scrollIntoView({ block: "start", behavior: "smooth" });
  });
  sync();
  // The admin can hide images after load (home-gallery-controls.js).
  if ("MutationObserver" in window) new MutationObserver(sync).observe(grid, { childList: true });
})();

/* Website rail: minimal edge arrows. Hovering an edge glides the rail that
   way (speed grows towards the very edge); clicking jumps one card. */
(function () {
  "use strict";
  var wrap = document.querySelector(".h-railwrap");
  var rail = document.getElementById("websiteRail");
  if (!wrap || !rail) return;
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var sync = function () {
    var end = rail.scrollWidth - rail.clientWidth;
    wrap.classList.toggle("can-prev", rail.scrollLeft > 2);
    wrap.classList.toggle("can-next", rail.scrollLeft < end - 2);
  };
  rail.addEventListener("scroll", sync, { passive: true });
  window.addEventListener("resize", sync, { passive: true });
  sync();
  var raf = null, dir = 0, speed = 0, snap = "";
  var tick = function () {
    rail.scrollLeft += dir * speed;
    raf = requestAnimationFrame(tick);
  };
  var start = function (edge, d) {
    return function (e) {
      if (reduced) return;
      dir = d;
      var r = edge.getBoundingClientRect();
      var depth = d > 0 ? (e.clientX - r.left) / r.width : (r.right - e.clientX) / r.width;
      speed = 4 + Math.max(0, Math.min(1, depth)) * 10;
      edge.classList.add("is-gliding");
      if (!raf) { snap = rail.style.scrollSnapType; rail.style.scrollSnapType = "none"; raf = requestAnimationFrame(tick); }
    };
  };
  var stop = function (edge) {
    return function () {
      edge.classList.remove("is-gliding");
      if (raf) { cancelAnimationFrame(raf); raf = null; rail.style.scrollSnapType = snap; }
    };
  };
  [[".h-edge--next", 1], [".h-edge--prev", -1]].forEach(function (pair) {
    var edge = wrap.querySelector(pair[0]);
    if (!edge) return;
    var go = start(edge, pair[1]);
    edge.addEventListener("mouseenter", go);
    edge.addEventListener("mousemove", go);
    edge.addEventListener("mouseleave", stop(edge));
    edge.addEventListener("click", function () {
      var card = rail.querySelector(".un-work-card");
      var w = card ? card.getBoundingClientRect().width + 6 : rail.clientWidth * .5;
      rail.scrollBy({ left: pair[1] * w, behavior: reduced ? "auto" : "smooth" });
    });
  });
})();
