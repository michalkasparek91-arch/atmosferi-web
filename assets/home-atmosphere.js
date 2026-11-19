/* Atmosferi° homepage atmosphere layer. Pairs with home-atmosphere.css.
   No dependencies. Does not touch text nodes, so i18n keeps working. */
(function () {
  "use strict";
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* 1. Hero load sequence: colour arrives, title rises, then copy and card. */
  var hero = document.getElementById("home");
  var film = document.getElementById("heroFilm");
  if (hero) {
    var started = false;
    var start = function () {
      if (started) return;
      started = true;
      requestAnimationFrame(function () { hero.classList.add("is-loaded"); });
    };
    if (reduced) start();
    else {
      if (film && film.readyState < 2) film.addEventListener("loadeddata", start, { once: true });
      else start();
      // Never hold the page hostage to a slow video.
      setTimeout(start, 900);
    }
  }

  /* 2. Header steps aside on scroll down, returns on scroll up. */
  var header = document.getElementById("siteHeader");
  if (header && !reduced) {
    var lastY = window.scrollY;
    var busy = false;
    var update = function () {
      var y = window.scrollY;
      var delta = y - lastY;
      if (y < 160 || delta < -6) header.classList.remove("is-tucked");
      else if (delta > 6 && !header.classList.contains("menu-open")) header.classList.add("is-tucked");
      if (Math.abs(delta) > 6) lastY = y;
      busy = false;
    };
    window.addEventListener("scroll", function () {
      if (busy) return;
      busy = true;
      requestAnimationFrame(update);
    }, { passive: true });
    header.addEventListener("focusin", function () { header.classList.remove("is-tucked"); });
  }

  /* 3. Staggered image reveals: website rail and the full gallery. */
  document.querySelectorAll("#websiteRail .un-work-card").forEach(function (card, i) {
    card.style.setProperty("--i", String(i));
  });
  var tiles = Array.prototype.slice.call(document.querySelectorAll(".un-viz-item"));
  if (!tiles.length) return;
  if (reduced || !("IntersectionObserver" in window)) {
    tiles.forEach(function (t) { t.classList.add("visible"); });
    return;
  }
  var batch = 0;
  var batchTimer = null;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      // Tiles entering together get a short cascade; later ones start fresh.
      entry.target.style.setProperty("--i", String(batch++ % 6));
      entry.target.classList.add("visible");
      io.unobserve(entry.target);
    });
    clearTimeout(batchTimer);
    batchTimer = setTimeout(function () { batch = 0; }, 120);
  }, { threshold: 0.06, rootMargin: "0px 0px -4% 0px" });
  tiles.forEach(function (t) { io.observe(t); });
})();
